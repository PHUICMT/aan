import { app } from './state.svelte';

export function bumpSeriesMutation() {
  app.seriesMutationTick++;
}

export function bumpChapterProgress() {
  app.chapterProgressTick++;
}

export function toggleFavTag(name: string) {
  const i = app.favTags.indexOf(name);
  if (i >= 0) app.favTags.splice(i, 1);
  else app.favTags.push(name);
  localStorage.setItem('aan.fav_tags', JSON.stringify(app.favTags));
}

export function toggleSelectedTag(name: string) {
  const i = app.selectedTags.indexOf(name);
  if (i >= 0) app.selectedTags.splice(i, 1);
  else app.selectedTags.push(name);
}

export function clearSelectedTags() {
  app.selectedTags = [];
}

export function setTagCombo(mode: 'or' | 'and') {
  app.tagCombo = mode;
  try { localStorage.setItem('aan.library.tag_combo', mode); } catch {}
}
