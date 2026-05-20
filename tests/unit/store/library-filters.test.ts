import { describe, it, expect, beforeEach } from 'vitest';
import {
  toggleFavGenre,
  toggleSelectedGenre,
  clearSelectedGenres,
  setGenreCombo,
  bumpSeriesMutation,
  bumpChapterProgress,
} from '../../../src/shared/lib/store/library-filters.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  app.favGenres = [];
  app.selectedGenres = [];
  app.genreCombo = 'or';
  app.seriesMutationTick = 0;
  app.chapterProgressTick = 0;
});

describe('toggleFavGenre', () => {
  it('adds and removes', () => {
    toggleFavGenre('action');
    expect(app.favGenres).toContain('action');
    toggleFavGenre('action');
    expect(app.favGenres).not.toContain('action');
  });
  it('persists', () => {
    toggleFavGenre('romance');
    expect(JSON.parse(localStorage.getItem('aan.fav_genres')!)).toContain('romance');
  });
});

describe('toggleSelectedGenre', () => {
  it('adds + removes without persistence', () => {
    toggleSelectedGenre('a');
    toggleSelectedGenre('b');
    expect(app.selectedGenres).toEqual(['a', 'b']);
    toggleSelectedGenre('a');
    expect(app.selectedGenres).toEqual(['b']);
    expect(localStorage.getItem('aan.selected_genres')).toBeNull();
  });
});

describe('clearSelectedGenres', () => {
  it('empties the list', () => {
    app.selectedGenres = ['x', 'y'];
    clearSelectedGenres();
    expect(app.selectedGenres).toEqual([]);
  });
});

describe('setGenreCombo', () => {
  it('persists and applies', () => {
    setGenreCombo('and');
    expect(app.genreCombo).toBe('and');
    expect(localStorage.getItem('aan.library.genre_combo')).toBe('and');
  });
});

describe('bumpers', () => {
  it('bumpSeriesMutation increments', () => {
    bumpSeriesMutation();
    bumpSeriesMutation();
    expect(app.seriesMutationTick).toBe(2);
  });
  it('bumpChapterProgress increments', () => {
    bumpChapterProgress();
    expect(app.chapterProgressTick).toBe(1);
  });
});
