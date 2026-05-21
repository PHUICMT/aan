import type { PageId } from './types';

export const NAV_ITEMS: { id: PageId; labelKey: string; icon: string }[] = [
  { id: 'home',      labelKey: 'nav.home',      icon: 'sun' },
  { id: 'library',   labelKey: 'nav.library',   icon: 'book' },
  { id: 'favorites', labelKey: 'nav.favorites', icon: 'heart' },
  { id: 'history',   labelKey: 'nav.history',   icon: 'clock' },
  { id: 'settings',  labelKey: 'nav.settings',  icon: 'settings' },
];

// Top-level category chips for Library. Stored series.type can be more
// specific (manhwa, light_novel, …); category match collapses them so
// users can keep the filter UI simple.
export const LIBRARY_FILTERS: { id: string; labelKey: string }[] = [
  { id: 'all',            labelKey: 'filter.all' },
  { id: 'manga',          labelKey: 'filter.manga' },
  { id: 'comic',          labelKey: 'filter.comic' },
  { id: 'novel',          labelKey: 'filter.novel' },
  { id: 'original_novel', labelKey: 'filter.original' },
];

/** Specific type that imports can carry. Filter chips use the top-level
 *  category (see CATEGORY_OF). */
export const KIND_OPTIONS: { id: string; labelKey: string }[] = [
  // Visual (image-based pages):
  { id: 'manga',          labelKey: 'kind.manga' },
  { id: 'comic',          labelKey: 'kind.comic' },
  { id: 'manhwa',         labelKey: 'kind.manhwa' },
  { id: 'manhua',         labelKey: 'kind.manhua' },
  { id: 'doujinshi',      labelKey: 'kind.doujinshi' },
  { id: 'magazine',       labelKey: 'kind.magazine' },
  { id: 'artbook',        labelKey: 'kind.artbook' },
  // Text (EPUB/TXT):
  { id: 'novel',          labelKey: 'kind.novel' },
  { id: 'light_novel',    labelKey: 'kind.light_novel' },
  { id: 'web_novel',      labelKey: 'kind.web_novel' },
  { id: 'original_novel', labelKey: 'kind.original_novel' },
];

/** Map a specific kind to the broad Library filter bucket. */
export function categoryOf(kind: string): string {
  switch (kind) {
    case 'comic': case 'magazine': case 'artbook':
      return 'comic';
    case 'novel': case 'light_novel': case 'web_novel':
      return 'novel';
    case 'original_novel':
      return 'original_novel';
    default:
      // manga / manhwa / manhua / doujinshi / unknown → manga bucket
      return 'manga';
  }
}

/** True for kinds whose chapters are page images (PDF/CBZ/folder pipeline). */
export function isVisualKind(kind: string): boolean {
  return categoryOf(kind) !== 'novel' && categoryOf(kind) !== 'original_novel';
}

export const TYPE_CHIP: Record<string, { bg: string; fg: string; labelKey: string }> = {
  manga:          { bg: 'var(--chip-manga-bg)',    fg: 'var(--chip-manga-fg)',    labelKey: 'kind.manga' },
  comic:          { bg: 'var(--chip-comic-bg)',    fg: 'var(--chip-comic-fg)',    labelKey: 'kind.comic' },
  manhwa:         { bg: 'rgba(244,114,182,0.22)',  fg: '#f9a8d4',                 labelKey: 'kind.manhwa' },
  manhua:         { bg: 'rgba(248,113,113,0.22)',  fg: '#fca5a5',                 labelKey: 'kind.manhua' },
  doujinshi:      { bg: 'rgba(251,146,60,0.22)',   fg: '#fdba74',                 labelKey: 'kind.doujinshi' },
  magazine:       { bg: 'rgba(34,211,238,0.22)',   fg: '#67e8f9',                 labelKey: 'kind.magazine' },
  artbook:        { bg: 'rgba(20,184,166,0.22)',   fg: '#5eead4',                 labelKey: 'kind.artbook' },
  novel:          { bg: 'var(--chip-novel-bg)',    fg: 'var(--chip-novel-fg)',    labelKey: 'kind.novel' },
  light_novel:    { bg: 'rgba(250,204,21,0.22)',   fg: '#fde047',                 labelKey: 'kind.light_novel' },
  web_novel:      { bg: 'rgba(132,204,22,0.22)',   fg: '#bef264',                 labelKey: 'kind.web_novel' },
  original_novel: { bg: 'var(--chip-original-bg)', fg: 'var(--chip-original-fg)', labelKey: 'kind.original_novel' },
};

export const STATUS_KEY: Record<number, string> = {
  0: 'status.unknown',
  1: 'status.ongoing',
  2: 'status.completed',
};

/** User-controlled reading list status (independent of series.status). */
export const READING_STATUSES: { id: string; labelKey: string; chipColor: string }[] = [
  { id: 'plan',       labelKey: 'rs.plan',       chipColor: '#60a5fa' },
  { id: 'reading',    labelKey: 'rs.reading',    chipColor: '#a78bfa' },
  { id: 'completed',  labelKey: 'rs.completed',  chipColor: '#4ade80' },
  { id: 'on_hold',    labelKey: 'rs.on_hold',    chipColor: '#fbbf24' },
  { id: 'dropped',    labelKey: 'rs.dropped',    chipColor: '#f87171' },
];

/** Curated UI font choices. Empty `value` = use default token. */
export const UI_FONTS: { value: string; label: string }[] = [
  { value: '', label: 'settings.font.default' },
  { value: '"IBM Plex Sans Thai", system-ui, sans-serif', label: 'IBM Plex Sans Thai' },
  { value: '"Sarabun", system-ui, sans-serif', label: 'Sarabun' },
  { value: '"Noto Sans Thai", system-ui, sans-serif', label: 'Noto Sans Thai' },
  { value: '"Prompt", system-ui, sans-serif', label: 'Prompt' },
  { value: '"Kanit", system-ui, sans-serif', label: 'Kanit' },
  { value: '"Mitr", system-ui, sans-serif', label: 'Mitr' },
  { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
];

/** Curated novel font choices. Empty `value` = inherit UI font. */
export const NOVEL_FONTS: { value: string; label: string }[] = [
  { value: '', label: 'settings.font.inherit' },
  { value: '"Sarabun", "Noto Serif Thai", serif', label: 'Sarabun' },
  { value: '"Noto Serif Thai", serif', label: 'Noto Serif Thai' },
  { value: '"IBM Plex Sans Thai", sans-serif', label: 'IBM Plex Sans Thai' },
  { value: '"Trirong", serif', label: 'Trirong' },
  { value: '"Prompt", sans-serif', label: 'Prompt' },
  { value: '"Kanit", sans-serif', label: 'Kanit' },
  { value: '"Mitr", sans-serif', label: 'Mitr' },
];

export const FONT_SIZE_UI = { min: 11, max: 18, default: 13 };
export const FONT_SIZE_NOVEL = { min: 14, max: 28, default: 17 };

export const ANIM = {
  cardStaggerMs: 50,
  cardStaggerCap: 600,
  pageFadeMs: 220,
};
