import en from '../locales/en.json';
import th from '../locales/th.json';
import { app } from './store.svelte';
import type { Lang } from './types';

const DICTS: Record<Lang, Record<string, string>> = { en, th };
const FALLBACK: Lang = 'en';

export const AVAILABLE_LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'th', label: 'ไทย' },
];

export function t(key: string): string {
  return DICTS[app.lang]?.[key] ?? DICTS[FALLBACK][key] ?? key;
}
