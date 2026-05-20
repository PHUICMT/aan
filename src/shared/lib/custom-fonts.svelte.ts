// Surfaces user-installed fonts to the rest of the app. On boot we list
// everything in <data_root>/fonts/, fetch each blob, inject @font-face
// rules, then mirror the list as a reactive Svelte store so the picker
// and reader update without a refresh.

import { listCustomFonts, readCustomFontBytes, type CustomFont } from './api';

export const customFonts = $state<{ list: CustomFont[]; loaded: boolean }>({
  list: [],
  loaded: false,
});

// Tracks which families are currently style-injected so re-scans don't
// double-register or leak object URLs.
const injected = new Map<string, { url: string; styleEl: HTMLStyleElement }>();

function mimeFor(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'ttf') return 'font/ttf';
  if (ext === 'otf') return 'font/otf';
  if (ext === 'woff') return 'font/woff';
  if (ext === 'woff2') return 'font/woff2';
  return 'application/octet-stream';
}

async function injectFont(font: CustomFont): Promise<void> {
  if (injected.has(font.filename)) return;
  const bytes = await readCustomFontBytes(font.filename);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeFor(font.filename) }));
  const styleEl = document.createElement('style');
  styleEl.dataset.customFont = font.filename;
  styleEl.textContent = `@font-face {
  font-family: ${JSON.stringify(font.family)};
  src: url(${JSON.stringify(url)});
  font-display: swap;
}`;
  document.head.appendChild(styleEl);
  injected.set(font.filename, { url, styleEl });
}

function evictFont(filename: string): void {
  const entry = injected.get(filename);
  if (!entry) return;
  URL.revokeObjectURL(entry.url);
  entry.styleEl.remove();
  injected.delete(filename);
}

/** Re-read the fonts dir and reconcile what's injected. Safe to call
 *  multiple times — installs/removals are diffed against `injected`. */
export async function refreshCustomFonts(): Promise<void> {
  const next = await listCustomFonts();
  const want = new Set(next.map((f) => f.filename));
  for (const filename of [...injected.keys()]) {
    if (!want.has(filename)) evictFont(filename);
  }
  await Promise.all(next.map((f) => injectFont(f).catch(() => {})));
  customFonts.list = next;
  customFonts.loaded = true;
}
