// Bulk import: dispatches by extension. PDFs need pdf.js up-front for the
// page count + thumbnail; CBZ and TXT push the heavy lifting to Rust.

import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseImportFilename } from '../../shared/lib/import-parser';
import {
  importPdf,
  importCbz,
  importTxt,
  importEpub,
  importImageFolder,
  readImportPdf,
  bulkUpdateSeries,
  type ImportedChapter,
} from '../../shared/lib/api';

if (typeof pdfjs.GlobalWorkerOptions !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

const COVER_MAX_WIDTH = 480;

export type ImportProgress = {
  total: number;
  done: number;
  current: string;
  errors: { file: string; error: string }[];
  imported: ImportedChapter[];
  duplicates: { file: string; pid: number; chapterId: string }[];
};

type Ext = 'pdf' | 'cbz' | 'txt' | 'epub';

function fileBaseName(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const tail = norm.slice(norm.lastIndexOf('/') + 1);
  return tail || p;
}

function detectExt(path: string): Ext | null {
  const m = path.toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  if (!m) return null;
  const ext = m[1];
  return ext === 'pdf' || ext === 'cbz' || ext === 'txt' || ext === 'epub'
    ? (ext as Ext)
    : null;
}

async function renderCoverBytes(doc: pdfjs.PDFDocumentProxy): Promise<number[] | null> {
  try {
    const page = await doc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1, COVER_MAX_WIDTH / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
    );
    if (!blob) return null;
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  } catch {
    return null;
  }
}

export type ImportKinds = { visual: string; text: string };
const DEFAULT_KINDS: ImportKinds = { visual: 'manga', text: 'novel' };

async function importOnePdf(path: string, filename: string, kind: string): Promise<ImportedChapter> {
  const bytes = await readImportPdf(path);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = doc.numPages;
  const cover = await renderCoverBytes(doc);
  try { doc.destroy(); } catch { /* pdfjs occasionally throws on early destroy */ }
  const parsed = parseImportFilename(filename);
  return importPdf({
    srcPath: path,
    seriesName: parsed.suggestedSeries,
    kind,
    chapterNo: parsed.chapterNo,
    chapterTitle: parsed.chapterTitle,
    pageCount,
    coverBytes: cover,
  });
}

async function importOneCbz(path: string, filename: string, kind: string): Promise<ImportedChapter> {
  const parsed = parseImportFilename(filename);
  return importCbz({
    srcPath: path,
    seriesName: parsed.suggestedSeries,
    kind,
    chapterNo: parsed.chapterNo,
    chapterTitle: parsed.chapterTitle,
  });
}

async function importOneTxt(path: string, filename: string, kind: string): Promise<ImportedChapter> {
  const parsed = parseImportFilename(filename);
  return importTxt({
    srcPath: path,
    seriesName: parsed.suggestedSeries,
    kind,
    chapterNo: parsed.chapterNo,
    chapterTitle: parsed.chapterTitle,
  });
}

/** EPUBs surface ImportedEpub (multi-chapter); convert to the per-file shape. */
async function importOneEpub(path: string, kind: string): Promise<ImportedChapter> {
  const out = await importEpub({ srcPath: path, kind });
  return { pid: out.pid, chapter_id: `epub:${out.chapters_added}`, created_series: out.created_series };
}

async function applyTags(pid: number, tags: string[]): Promise<void> {
  const cleaned = tags.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleaned.length === 0) return;
  try { await bulkUpdateSeries([pid], { addTags: cleaned }); } catch { /* tagging failure must not abort import */ }
}

export async function importFiles(
  paths: string[],
  onProgress?: (p: ImportProgress) => void,
  kinds: ImportKinds = DEFAULT_KINDS,
  tags: string[] = [],
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    total: paths.length,
    done: 0,
    current: '',
    errors: [],
    imported: [],
    duplicates: [],
  };
  onProgress?.(progress);

  for (const path of paths) {
    const filename = fileBaseName(path);
    progress.current = filename;
    onProgress?.({ ...progress });

    try {
      const ext = detectExt(path);
      if (!ext) throw new Error(`unsupported extension: ${filename}`);
      const imported =
        ext === 'pdf' ? await importOnePdf(path, filename, kinds.visual) :
        ext === 'cbz' ? await importOneCbz(path, filename, kinds.visual) :
        ext === 'epub' ? await importOneEpub(path, kinds.text) :
        await importOneTxt(path, filename, kinds.text);
      if ((imported as { duplicate?: boolean }).duplicate) {
        progress.duplicates.push({
          file: filename,
          pid: (imported as { pid: number }).pid,
          chapterId: (imported as { chapter_id?: string }).chapter_id ?? '',
        });
      } else {
        progress.imported.push(imported);
        await applyTags(imported.pid, tags);
      }
    } catch (e) {
      progress.errors.push({ file: filename, error: String(e) });
    }

    progress.done += 1;
    onProgress?.({ ...progress });
  }

  progress.current = '';
  onProgress?.({ ...progress });
  return progress;
}

/** Import each picked folder as a single chapter; folder name supplies the heuristic. */
export async function importFolders(
  paths: string[],
  onProgress?: (p: ImportProgress) => void,
  kinds: ImportKinds = DEFAULT_KINDS,
  tags: string[] = [],
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    total: paths.length,
    done: 0,
    current: '',
    errors: [],
    imported: [],
    duplicates: [],
  };
  onProgress?.(progress);

  for (const path of paths) {
    const folderName = fileBaseName(path);
    progress.current = folderName;
    onProgress?.({ ...progress });

    try {
      const parsed = parseImportFilename(folderName);
      const imported = await importImageFolder({
        srcPath: path,
        seriesName: parsed.suggestedSeries,
        kind: kinds.visual,
        chapterNo: parsed.chapterNo,
        chapterTitle: parsed.chapterTitle,
      });
      if ((imported as { duplicate?: boolean }).duplicate) {
        progress.duplicates.push({ file: folderName, pid: imported.pid, chapterId: imported.chapter_id });
      } else {
        progress.imported.push(imported);
        await applyTags(imported.pid, tags);
      }
    } catch (e) {
      progress.errors.push({ file: folderName, error: String(e) });
    }

    progress.done += 1;
    onProgress?.({ ...progress });
  }

  progress.current = '';
  onProgress?.({ ...progress });
  return progress;
}

// Back-compat alias — old call sites keep working until they migrate.
export const importPdfFiles = importFiles;
