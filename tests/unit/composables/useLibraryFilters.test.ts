import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Host from './LibraryFiltersHost.svelte';
import type { SeriesCard } from '../../../src/shared/lib/types';
import { app } from '../../../src/shared/lib/store/state.svelte';
import type { useLibraryFilters } from '../../../src/features/library/composables/useLibraryFilters.svelte';

type LF = ReturnType<typeof useLibraryFilters>;

function s(over: Partial<SeriesCard>): SeriesCard {
  return {
    pid: 0,
    name: 'name',
    alias: null,
    type: 'manga',
    status: 1,
    cover_path: null,
    chapter_count: 10,
    local_chapter_count: 5,
    last_updated: '2024-01-01',
    tags: [],
    is_favorite: 0,
    last_read_at: null,
    reading_status: null,
    ...over,
  };
}

const seed: SeriesCard[] = [
  s({ pid: 1, name: 'Bleach',  type: 'manga',          status: 1, local_chapter_count: 10, chapter_count: 10, tags: ['action'], last_updated: '2024-03-01', last_read_at: '2024-04-01', reading_status: 'reading' }),
  s({ pid: 2, name: 'Anne',    type: 'novel',          status: 2, local_chapter_count: 3,  chapter_count: 10, tags: ['drama'],  last_updated: '2024-01-10', last_read_at: '2024-02-01', reading_status: 'plan' }),
  s({ pid: 3, name: 'Comic A', type: 'comic',          status: 0, local_chapter_count: 0,  chapter_count: 5,  tags: ['action', 'drama'], last_updated: '2024-02-15' }),
  s({ pid: 4, name: 'Original',type: 'original_novel', status: 1, local_chapter_count: 7,  chapter_count: 10, tags: ['romance'], last_updated: '2024-02-20' }),
];

let lf: LF;

beforeEach(() => {
  app.selectedGenres = [];
  app.genreCombo = 'or';
  render(Host as any, { props: { series: seed, expose: (x: LF) => { lf = x; } } as any });
});

describe('useLibraryFilters', () => {
  it('starts with all series', () => {
    expect(lf.filtered.length).toBe(4);
  });

  it('type filter narrows to one kind', () => {
    lf.typeFilter = 'novel';
    expect(lf.filtered.map((x) => x.pid)).toEqual([2]);
  });

  it('status filter ongoing keeps status=1', () => {
    lf.statusFilter = 'ongoing';
    expect(lf.filtered.every((x) => x.status === 1)).toBe(true);
  });

  it('download filter complete returns rows where local >= chapter_count', () => {
    lf.dlFilter = 'complete';
    expect(lf.filtered.map((x) => x.pid)).toEqual([1]);
  });

  it('rs filter "none" returns series with no reading_status', () => {
    lf.rsFilter = 'none';
    expect(lf.filtered.every((x) => x.reading_status === null)).toBe(true);
  });

  it('query matches by name (case-insensitive)', () => {
    lf.query = 'bleach';
    expect(lf.filtered.map((x) => x.pid)).toEqual([1]);
  });

  it('genre OR combo matches any selected tag', () => {
    app.selectedGenres = ['romance'];
    expect(lf.filtered.map((x) => x.pid)).toEqual([4]);
  });

  it('genre AND combo requires all tags', () => {
    app.selectedGenres = ['action', 'drama'];
    app.genreCombo = 'and';
    expect(lf.filtered.map((x) => x.pid)).toEqual([3]);
  });

  it('sortKey=name sorts alphabetically', () => {
    lf.sortKey = 'name';
    const names = lf.filtered.map((x) => x.name);
    expect(names).toEqual([...names].sort());
  });

  it('sortKey=progress puts complete first', () => {
    lf.sortKey = 'progress';
    expect(lf.filtered[0].pid).toBe(1);
  });

  it('sortKey=last_read puts most-recent first', () => {
    lf.sortKey = 'last_read';
    expect(lf.filtered[0].pid).toBe(1);
  });

  it('activeFilterCount reflects non-default filters', () => {
    expect(lf.activeFilterCount).toBe(0);
    lf.statusFilter = 'ongoing';
    lf.dlFilter = 'complete';
    expect(lf.activeFilterCount).toBe(2);
  });

  it('countFor returns per-type counts', () => {
    expect(lf.countFor('all')).toBe(4);
    expect(lf.countFor('manga')).toBe(1);
    expect(lf.countFor('novel')).toBe(1);
  });

  it('statusCount / dlCount / rsCount return derived counts', () => {
    expect(lf.statusCount('all')).toBe(4);
    expect(lf.statusCount('ongoing')).toBe(2);
    expect(lf.dlCount('complete')).toBe(1);
    expect(lf.rsCount('reading')).toBe(1);
  });

  it('setView swaps the view mode and persists', () => {
    lf.setView('list');
    expect(lf.viewMode).toBe('list');
    expect(localStorage.getItem('aan.lib.view')).toBe('list');
  });

  it('filtersOpen toggles', () => {
    lf.filtersOpen = true;
    expect(lf.filtersOpen).toBe(true);
  });
});
