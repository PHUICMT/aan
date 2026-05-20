import type { PageId } from './types';

export const NAV_ITEMS: { id: PageId; labelKey: string; icon: string }[] = [
  { id: 'home',      labelKey: 'nav.home',      icon: 'sun' },
  { id: 'library',   labelKey: 'nav.library',   icon: 'book' },
  { id: 'favorites', labelKey: 'nav.favorites', icon: 'heart' },
  { id: 'history',   labelKey: 'nav.history',   icon: 'clock' },
  { id: 'settings',  labelKey: 'nav.settings',  icon: 'settings' },
];

export const LIBRARY_FILTERS: { id: string; labelKey: string }[] = [
  { id: 'all',            labelKey: 'filter.all' },
  { id: 'manga',          labelKey: 'filter.manga' },
  { id: 'comic',          labelKey: 'filter.comic' },
  { id: 'novel',          labelKey: 'filter.novel' },
  { id: 'original_novel', labelKey: 'filter.original' },
];

export const TYPE_CHIP: Record<string, { bg: string; fg: string; labelKey: string }> = {
  manga:          { bg: 'var(--chip-manga-bg)',    fg: 'var(--chip-manga-fg)',    labelKey: 'filter.manga' },
  comic:          { bg: 'var(--chip-comic-bg)',    fg: 'var(--chip-comic-fg)',    labelKey: 'filter.comic' },
  novel:          { bg: 'var(--chip-novel-bg)',    fg: 'var(--chip-novel-fg)',    labelKey: 'filter.novel' },
  original_novel: { bg: 'var(--chip-original-bg)', fg: 'var(--chip-original-fg)', labelKey: 'filter.original' },
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
