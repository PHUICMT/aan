import { app, applyFonts } from './state.svelte';

function persistFonts() {
  localStorage.setItem('aan.font.ui', app.fontUi);
  localStorage.setItem('aan.font.ui.size', String(app.fontUiSize));
  localStorage.setItem('aan.font.novel', app.fontNovel);
  localStorage.setItem('aan.font.novel.size', String(app.fontNovelSize));
  applyFonts(app.fontUi, app.fontUiSize, app.fontNovel, app.fontNovelSize);
}

export function setFontUi(family: string) { app.fontUi = family; persistFonts(); }
export function setFontUiSize(px: number) {
  app.fontUiSize = Math.min(18, Math.max(11, Math.round(px)));
  persistFonts();
}
export function setFontNovel(family: string) { app.fontNovel = family; persistFonts(); }
export function setFontNovelSize(px: number) {
  app.fontNovelSize = Math.min(28, Math.max(14, Math.round(px)));
  persistFonts();
}
