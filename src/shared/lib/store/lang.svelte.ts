import { app } from './state.svelte';
import type { Lang } from '../types';

export function setLang(l: Lang) {
  app.lang = l;
  localStorage.setItem('aan.lang', l);
}
