// Single-use chapter-bytes prefetch cache, keyed by chapter_id.
// takeChapterBytes() removes the entry to avoid pinning large PDFs.

import { readChapterBytes } from './api';

const MAX_ENTRIES = 3;
const cache = new Map<string, Promise<Uint8Array>>();

function evictOldest() {
  while (cache.size > MAX_ENTRIES) {
    const k = cache.keys().next().value;
    if (k === undefined) break;
    cache.delete(k);
  }
}

function isCacheableExt(path: string): boolean {
  const p = path.toLowerCase();
  return p.endsWith('.pdf') || p.endsWith('.html') || p.endsWith('.htm') || p.endsWith('.txt');
}

/** Fire-and-forget. Skips image-dir chapters (not a single blob). Idempotent. */
export function prefetchChapter(chapterId: string | undefined | null, pdfPath: string | undefined | null) {
  if (!chapterId || !pdfPath) return;
  if (!isCacheableExt(pdfPath)) return;
  if (cache.has(chapterId)) return;
  const p = readChapterBytes(pdfPath).catch(() => new Uint8Array());
  cache.set(chapterId, p);
  evictOldest();
}

/** Alias of `prefetchChapter` for end-of-chapter call sites. */
export function prefetchChapterBytes(chapterId: string | undefined | null, pdfPath: string | undefined | null) {
  prefetchChapter(chapterId, pdfPath);
}

export function hasPrefetched(chapterId: string | undefined | null): boolean {
  return !!(chapterId && cache.has(chapterId));
}

/** Consume cached bytes, or fall back to a fresh disk read. */
export async function takeChapterBytes(
  chapterId: string | undefined | null,
  pdfPath: string,
): Promise<Uint8Array> {
  if (chapterId) {
    const cached = cache.get(chapterId);
    if (cached) {
      cache.delete(chapterId);
      return cached;
    }
  }
  return readChapterBytes(pdfPath);
}
