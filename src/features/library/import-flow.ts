// Bulk PDF import: read each file via pdfjs to grab page count + a cover
// thumbnail, hand off to the Rust `import_pdf` command, and surface progress.

import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseImportFilename } from '../../shared/lib/import-parser';
import { importPdf, readImportPdf, type ImportedChapter } from '../../shared/lib/api';

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

function fileBaseName(p: string): string {
  const norm = p.replace(/\\/g, '/');
  const tail = norm.slice(norm.lastIndexOf('/') + 1);
  return tail || p;
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

export async function importPdfFiles(
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
      const bytes = await readImportPdf(path);
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const pageCount = doc.numPages;
      const cover = await renderCoverBytes(doc);
      const parsed = parseImportFilename(filename);
      try { doc.destroy(); } catch { /* pdfjs sometimes throws on early destroy */ }

      const imported = await importPdf({
        srcPath: path,
        seriesName: parsed.suggestedSeries,
        kind: 'manga',
        chapterNo: parsed.chapterNo,
        chapterTitle: parsed.chapterTitle,
        pageCount,
        coverBytes: cover,
      });
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
