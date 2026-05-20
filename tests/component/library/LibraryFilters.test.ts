import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import LibraryFilters from '../../../src/features/library/LibraryFilters.svelte';
import { app, clearSelectedGenres } from '../../../src/shared/lib/store.svelte';
import { makeSeries } from '../helpers';
import { mountFilters } from './filters-fixture.svelte';

const baseSeries = () => [
  makeSeries({ pid: 1, type: 'manga',  status: 1, local_chapter_count: 3, chapter_count: 3, reading_status: 'reading', tags: ['action'] }),
  makeSeries({ pid: 2, type: 'novel',  status: 2, local_chapter_count: 1, chapter_count: 3, reading_status: null,       tags: ['romance'] }),
  makeSeries({ pid: 3, type: 'manga',  status: 0, local_chapter_count: 0, chapter_count: 5, reading_status: 'plan',     tags: ['action', 'romance'] }),
];

beforeEach(() => {
  // Clear genre selection between tests.
  clearSelectedGenres();
  app.favGenres = [];
});

describe('LibraryFilters', () => {
  it('filter toggle opens the panel', async () => {
    const { filters } = mountFilters(() => baseSeries());
    const { container } = render(LibraryFilters, {
      props: { filters, genres: [{ name: 'action', count: 2 }], loading: false },
    });
    expect(container.querySelector('.filters-panel')).toBeNull();
    await fireEvent.click(container.querySelector('button.filters-toggle') as HTMLButtonElement);
    flushSync();
    expect(container.querySelector('.filters-panel')).not.toBeNull();
  });

  it('status filter click sets statusFilter', async () => {
    const { filters } = mountFilters(() => baseSeries());
    filters.filtersOpen = true;
    const { container } = render(LibraryFilters, {
      props: { filters, genres: [], loading: false },
    });
    flushSync();
    const pills = container.querySelectorAll('.filter-section:nth-of-type(1) button.status-filter');
    // STATUS_FILTERS = [all, ongoing, completed, unknown]; click "completed".
    await fireEvent.click(pills[2] as HTMLButtonElement);
    expect(filters.statusFilter).toBe('completed');
  });

  it('dl filter click sets dlFilter', async () => {
    const { filters } = mountFilters(() => baseSeries());
    filters.filtersOpen = true;
    const { container } = render(LibraryFilters, {
      props: { filters, genres: [], loading: false },
    });
    flushSync();
    // DL section is the 3rd filter-section.
    const pills = container.querySelectorAll('.filter-section:nth-of-type(3) button.status-filter');
    await fireEvent.click(pills[1] as HTMLButtonElement); // "complete"
    expect(filters.dlFilter).toBe('complete');
  });

  it('rs filter click sets rsFilter', async () => {
    const { filters } = mountFilters(() => baseSeries());
    filters.filtersOpen = true;
    const { container } = render(LibraryFilters, {
      props: { filters, genres: [], loading: false },
    });
    flushSync();
    const pills = container.querySelectorAll('.filter-section:nth-of-type(2) button.status-filter');
    // RS_FILTERS = [all, none, plan, reading, completed, on_hold, dropped]; pick "plan".
    await fireEvent.click(pills[2] as HTMLButtonElement);
    expect(filters.rsFilter).toBe('plan');
  });

  it('clicking a genre name toggles selection in app store', async () => {
    const { filters } = mountFilters(() => baseSeries());
    filters.filtersOpen = true;
    const { container } = render(LibraryFilters, {
      props: { filters, genres: [{ name: 'action', count: 2 }], loading: false },
    });
    flushSync();
    const genre = container.querySelector('.genre-name') as HTMLButtonElement;
    await fireEvent.click(genre);
    expect(app.selectedGenres).toContain('action');
  });

  it('combo seg shows when >= 2 genres selected and switches mode', async () => {
    const { filters } = mountFilters(() => baseSeries());
    filters.filtersOpen = true;
    app.selectedGenres = ['action', 'romance'];
    const { container } = render(LibraryFilters, {
      props: {
        filters,
        genres: [
          { name: 'action', count: 2 },
          { name: 'romance', count: 2 },
        ],
        loading: false,
      },
    });
    flushSync();
    const seg = container.querySelector('.combo-seg');
    expect(seg).not.toBeNull();
    const andBtn = seg!.querySelectorAll('button.combo-btn')[1] as HTMLButtonElement;
    await fireEvent.click(andBtn);
    expect(app.genreCombo).toBe('and');
  });

  it('skeletonOnly shows shimmer instead of filters toggle', () => {
    const { filters } = mountFilters(() => baseSeries());
    const { container } = render(LibraryFilters, {
      props: { filters, genres: [], loading: false, skeletonOnly: true },
    });
    expect(container.querySelector('.filters-toggle-skel')).not.toBeNull();
    expect(container.querySelector('.filters-toggle')).toBeNull();
  });
});
