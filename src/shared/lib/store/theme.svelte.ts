import { app } from './state.svelte';
import type { Theme } from './state.svelte';

//───── Theme switching ─────

let themeAnimTimer: ReturnType<typeof setTimeout> | null = null;
export function setTheme(t: Theme) {
  app.theme = t;
  localStorage.setItem('aan.theme', t);
  const root = document.documentElement;
  // Force a layout flush under the OLD palette before swapping, otherwise
  // Chromium batches both dataset writes into one recalc and snaps colors.
  root.dataset.themeAnim = '';
  void root.offsetWidth;
  requestAnimationFrame(() => {
    root.dataset.theme = t;
  });
  if (themeAnimTimer) clearTimeout(themeAnimTimer);
  themeAnimTimer = setTimeout(() => {
    delete root.dataset.themeAnim;
  }, 900);
}

export type { Theme };
