// Bulk import: dispatches by extension. PDFs need pdf.js up-front for the
// page count + thumbnail; CBZ and TXT push the heavy lifting to Rust.

import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseImportFilename } from '../../shared/lib/import-parser';
import {
  importPdf,
  importCbz,
  importTxt,
  readImportPdf,
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
};

type Ext = 'pdf' | 'cbz' | 'txt';

function fileBaseName(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const tail = norm.slice(norm.lastIndexOf('/') + 1);
  return tail || p;
}

function detectExt(path: string): Ext | null {
  const m = path.toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  if (!m) return null;
  const ext = m[1];
  return ext === 'pdf' || ext === 'cbz' || ext === 'txt' ? (ext as Ext) : null;
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

async function importOnePdf(path: string, filename: string): Promise<ImportedChapter> {
  const bytes = await readImportPdf(path);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = doc.numPages;
  const cover = await renderCoverBytes(doc);
  try { doc.destroy(); } catch { /* pdfjs occasionally throws on early destroy */ }
  const parsed = parseImportFilename(filename);
  return importPdf({
    srcPath: path,
    seriesName: parsed.suggestedSeries,
    kind: 'manga',
    chapterNo: parsed.chapterNo,
    chapterTitle: parsed.chapterTitle,
    pageCount,
    coverBytes: cover,
  });
}

async function importOneCbz(path: string, filename: string): Promise<ImportedChapter> {
  const parsed = parseImportFilename(filename);
  return importCbz({
    srcPath: path,
    seriesName: parsed.suggestedSeries,
    kind: 'manga',
    chapterNo: parsed.chapterNo,
    chapterTitle: parsed.chapterTitle,
  });
}

async function importOneTxt(path: string, filename: string): Promise<ImportedChapter> {
  const parsed = parseImportFilename(filename);
  return importTxt({
    srcPath: path,
    seriesName: parsed.suggestedSeries,
    kind: 'novel',
    chapterNo: parsed.chapterNo,
    chapterTitle: parsed.chapterTitle,
  });
}

export async function importFiles(
  paths: string[],
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportProgress> {
  const progress: ImportProgress = {
    total: paths.length,
    done: 0,
    current: '',
    errors: [],
    imported: [],
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
        ext === 'pdf' ? await importOnePdf(path, filename) :
        ext === 'cbz' ? await importOneCbz(path, filename) :
        await importOneTxt(path, filename);
      progress.imported.push(imported);
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

// Back-compat alias — old call sites keep working until they migrate.
export const importPdfFiles = importFiles;
