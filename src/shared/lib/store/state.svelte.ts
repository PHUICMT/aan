import type { Chapter, Lang, PageId, ReadingStatus } from '../types';

//───── Last-reader persistence ─────

export type LastReader = {
  pid: number;
  chapterId: string;
  seriesName: string;
  chapterNo: number;
  kind: string;
  /** Mirrored from MangaReader to dodge the DB write race on Continue pill. */
  lastPage?: number;
};

function loadLastReader(): LastReader | null {
  try {
    const raw = localStorage.getItem('aan.last_reader');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj.pid === 'number' &&
      typeof obj.chapterId === 'string' &&
      typeof obj.seriesName === 'string'
    ) {
      return {
        pid: obj.pid,
        chapterId: obj.chapterId,
        seriesName: obj.seriesName,
        chapterNo: Number(obj.chapterNo) || 0,
        kind: String(obj.kind ?? 'manga'),
        lastPage: typeof obj.lastPage === 'number' ? obj.lastPage : undefined,
      };
    }
  } catch {}
  return null;
}

//───── Theme ─────

export type Theme = 'dark' | 'light' | 'sepia' | 'oled' | 'dim';
const THEMES: Theme[] = ['dark', 'light', 'sepia', 'oled', 'dim'];
function parseTheme(v: string | null): Theme {
  return (THEMES as string[]).includes(v ?? '') ? (v as Theme) : 'dark';
}

//───── Initial values from localStorage ─────

const stored = localStorage.getItem('aan.lang') as Lang | null;
const initialLang: Lang = stored === 'th' || stored === 'en' ? stored : 'en';
const initialSidebar = localStorage.getItem('aan.sidebar') === 'collapsed';
const initialTheme = parseTheme(localStorage.getItem('aan.theme'));

export function clampInt(raw: string | null, lo: number, hi: number, def: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

export function clampFloat(raw: string | null, lo: number, hi: number, def: number): number {
  const n = parseFloat(raw ?? '');
  if (!Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

const initialFontUi = localStorage.getItem('aan.font.ui') ?? '';
const initialFontUiSize = clampInt(localStorage.getItem('aan.font.ui.size'), 11, 18, 13);
const initialFontNovel = localStorage.getItem('aan.font.novel') ?? '';
const initialFontNovelSize = clampInt(localStorage.getItem('aan.font.novel.size'), 14, 28, 17);

//───── Font + zoom ─────

let currentZoom = 1;

function applyAppZoom() {
  const appEl = document.getElementById('app');
  if (!appEl) {
    requestAnimationFrame(applyAppZoom);
    return;
  }
  const z = currentZoom;
  appEl.style.width = `${window.innerWidth / z}px`;
  appEl.style.height = `${window.innerHeight / z}px`;
  appEl.style.transform = `scale(${z})`;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => applyAppZoom());
}

export function applyFonts(uiFont: string, uiSize: number, novelFont: string, novelSize: number) {
  const root = document.documentElement;
  if (uiFont) root.style.setProperty('--font', uiFont);
  else root.style.removeProperty('--font');
  root.style.setProperty('--app-font-size', `${uiSize}px`);
  currentZoom = Math.round((uiSize / 13) * 1000) / 1000;
  root.style.setProperty('--ui-zoom', String(currentZoom));
  applyAppZoom();
  const novelEffective = novelFont || uiFont;
  if (novelEffective) root.style.setProperty('--font-novel', novelEffective);
  else root.style.removeProperty('--font-novel');
  root.style.setProperty('--novel-font-size', `${novelSize}px`);
}

applyFonts(initialFontUi, initialFontUiSize, initialFontNovel, initialFontNovelSize);

function loadFavGenres(): string[] {
  try {
    const raw = localStorage.getItem('aan.fav_genres');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

//───── App state ─────

export type NavDir = 'forward' | 'back';

export const app = $state({
  page: 'home' as PageId,
  prevPage: 'home' as PageId,
  seriesPid: null as number | null,
  readerChapter: null as Chapter | null,
  readerChapters: [] as Chapter[],
  lang: initialLang,
  navDir: 'forward' as NavDir,
  sidebarCollapsed: initialSidebar,
  theme: initialTheme as Theme,
  favGenres: loadFavGenres(),
  selectedGenres: [] as string[],
  /** 'or' = any tag matches; 'and' = all selected tags required. */
  genreCombo: ((): 'or' | 'and' => {
    const v = localStorage.getItem('aan.library.genre_combo');
    return v === 'and' ? 'and' : 'or';
  })(),
  fontUi: initialFontUi,
  fontUiSize: initialFontUiSize,
  fontNovel: initialFontNovel,
  fontNovelSize: initialFontNovelSize,
  shortcutsOpen: false,
  listStatus: 'reading' as ReadingStatus,
  closeToTray: localStorage.getItem('aan.close_to_tray') === '1',
  lastReader: loadLastReader() as LastReader | null,
  continueDismissed: false,
  /** Bumped on any series mutation; Sidebar/Library invalidate cached counts. */
  seriesMutationTick: 0,
  /** Bumped after chapter progress is persisted; SeriesDetail re-fetches. */
  chapterProgressTick: 0,
  /** 0.3..1.0 — content dim overlay; toolbar stays at full brightness. */
  readerBrightness: clampFloat(localStorage.getItem('aan.reader.brightness'), 0.3, 1, 1),
  /** 0..0.6 — amber tint strength, composes with brightness. */
  readerWarmth: clampFloat(localStorage.getItem('aan.reader.warmth'), 0, 0.6, 0),
});

/** Reader registers a flush callback while mounted; goBack() awaits it
 *  so SeriesDetail sees the committed last_page_read on remount. */
let readerFlush: (() => Promise<void>) | null = null;
export function registerReaderFlush(fn: (() => Promise<void>) | null) {
  readerFlush = fn;
}
export function getReaderFlush() {
  return readerFlush;
}

export type { Chapter, Lang, PageId, ReadingStatus };
