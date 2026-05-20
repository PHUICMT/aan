import { app } from './state.svelte';

export function bumpSeriesMutation() {
  app.seriesMutationTick++;
}

export function bumpChapterProgress() {
  app.chapterProgressTick++;
}

export function toggleFavGenre(name: string) {
  const i = app.favGenres.indexOf(name);
  if (i >= 0) app.favGenres.splice(i, 1);
  else app.favGenres.push(name);
  localStorage.setItem('aan.fav_genres', JSON.stringify(app.favGenres));
}

export function toggleSelectedGenre(name: string) {
  const i = app.selectedGenres.indexOf(name);
  if (i >= 0) app.selectedGenres.splice(i, 1);
  else app.selectedGenres.push(name);
}

export function clearSelectedGenres() {
  app.selectedGenres = [];
}

export function setGenreCombo(mode: 'or' | 'and') {
  app.genreCombo = mode;
  try { localStorage.setItem('aan.library.genre_combo', mode); } catch {}
}
