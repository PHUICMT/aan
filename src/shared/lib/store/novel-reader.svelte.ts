// Novel reader preferences — global defaults persisted in localStorage.
// Kept separate from the app-wide `theme` (which dresses chrome) so the
// reader can stay sepia even when the rest of the app is dark.

import { app } from './state.svelte';
import { setSeriesReaderPrefs } from '../api';

// When an override is active, mutations write through to the series
// row instead of the global localStorage key. Fire-and-forget — the UI
// already reflects the new value in app.novel*.
function persistOverride() {
  const pid = app.novelOverridePid;
  if (pid == null) return false;
  const snap = {
    layout: app.novelLayout,
    theme: app.novelTheme,
    lineHeight: app.novelLineHeight,
    maxWidth: app.novelMaxWidth,
    spread: app.novelSpread,
  };
  void setSeriesReaderPrefs(pid, JSON.stringify(snap)).catch(() => {});
  return true;
}

export type NovelLayout = 'scroll' | 'paged';
export type NovelTheme = 'light' | 'sepia' | 'dark' | 'black';

const LAYOUTS: NovelLayout[] = ['scroll', 'paged'];
const THEMES: NovelTheme[] = ['light', 'sepia', 'dark', 'black'];

function parseLayout(v: string | null): NovelLayout {
  return (LAYOUTS as string[]).includes(v ?? '') ? (v as NovelLayout) : 'scroll';
}
function parseTheme(v: string | null): NovelTheme {
  return (THEMES as string[]).includes(v ?? '') ? (v as NovelTheme) : 'dark';
}
function clampFloat(raw: string | null, lo: number, hi: number, def: number): number {
  const n = parseFloat(raw ?? '');
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}
function clampInt(raw: string | null, lo: number, hi: number, def: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

export const LINE_HEIGHT_MIN = 1.4;
export const LINE_HEIGHT_MAX = 2.4;
export const MAX_WIDTH_MIN = 560;
export const MAX_WIDTH_MAX = 1100;

export function loadNovelPrefs() {
  return {
    layout: parseLayout(localStorage.getItem('aan.novel.layout')),
    theme: parseTheme(localStorage.getItem('aan.novel.theme')),
    lineHeight: clampFloat(localStorage.getItem('aan.novel.line_height'), LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, 1.9),
    maxWidth: clampInt(localStorage.getItem('aan.novel.max_width'), MAX_WIDTH_MIN, MAX_WIDTH_MAX, 760),
    spread: localStorage.getItem('aan.novel.spread') === '1',
  };
}

export function setNovelLayout(v: NovelLayout) {
  app.novelLayout = v;
  if (persistOverride()) return;
  try { localStorage.setItem('aan.novel.layout', v); } catch {}
}
export function setNovelTheme(v: NovelTheme) {
  app.novelTheme = v;
  if (persistOverride()) return;
  try { localStorage.setItem('aan.novel.theme', v); } catch {}
}
export function setNovelLineHeight(v: number) {
  const n = Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, Math.round(v * 10) / 10));
  app.novelLineHeight = n;
  if (persistOverride()) return;
  try { localStorage.setItem('aan.novel.line_height', String(n)); } catch {}
}
export function setNovelMaxWidth(v: number) {
  const n = Math.min(MAX_WIDTH_MAX, Math.max(MAX_WIDTH_MIN, Math.round(v / 20) * 20));
  app.novelMaxWidth = n;
  if (persistOverride()) return;
  try { localStorage.setItem('aan.novel.max_width', String(n)); } catch {}
}
export function setNovelSpread(on: boolean) {
  app.novelSpread = on;
  if (persistOverride()) return;
  try { localStorage.setItem('aan.novel.spread', on ? '1' : '0'); } catch {}
}
