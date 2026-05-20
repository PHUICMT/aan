import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushSync } from 'svelte';

// Mock covers module to skip IntersectionObserver and blob loading.
vi.mock('../../../src/shared/lib/covers', () => ({
  getCoverUrl: vi.fn(async () => null),
  invalidateCover: vi.fn(),
}));

// Mock the API surface used by the card.
const setSeriesFavorite = vi.fn(async () => {});
const setReadingStatus = vi.fn(async () => {});
const deleteOrphanSeries = vi.fn(async () => true);
vi.mock('../../../src/shared/lib/api', async () => {
  return {
    setSeriesFavorite: (...a: unknown[]) => setSeriesFavorite(...a),
    setReadingStatus: (...a: unknown[]) => setReadingStatus(...a),
    deleteOrphanSeries: (...a: unknown[]) => deleteOrphanSeries(...a),
  };
});

import CoverCard from '../../../src/features/library/CoverCard.svelte';
import { app } from '../../../src/shared/lib/store.svelte';
import { makeSeries } from '../helpers';

beforeEach(() => {
  setSeriesFavorite.mockClear();
  setReadingStatus.mockClear();
  deleteOrphanSeries.mockClear();
});

describe('CoverCard', () => {
  it('renders series name and chapter counts', () => {
    const { container } = render(CoverCard, {
      props: { series: makeSeries({ name: 'My Series', local_chapter_count: 3, chapter_count: 10 }) },
    });
    expect(container.querySelector('.title')?.textContent).toBe('My Series');
    expect(container.querySelector('.meta')?.textContent).toContain('3');
    expect(container.querySelector('.meta')?.textContent).toContain('10');
  });

  it('progress bar width reflects download progress', () => {
    const { container } = render(CoverCard, {
      props: { series: makeSeries({ local_chapter_count: 5, chapter_count: 10 }) },
    });
    expect((container.querySelector('.bar') as HTMLElement).style.width).toBe('50%');
  });

  it('shows the new-badge when remote has unseen chapters', () => {
    const { container } = render(CoverCard, {
      props: { series: makeSeries({ local_chapter_count: 2, chapter_count: 5 }) },
    });
    expect(container.querySelector('.new-badge')?.textContent).toBe('+3');
  });

  it('shows fav-badge when is_favorite=1', () => {
    const { container } = render(CoverCard, {
      props: { series: makeSeries({ is_favorite: 1 }) },
    });
    expect(container.querySelector('.fav-badge')).not.toBeNull();
  });

  it('click navigates to series page (sets app.page="series")', async () => {
    app.page = 'home';
    const { container } = render(CoverCard, {
      props: { series: makeSeries({ pid: 42 }) },
    });
    await fireEvent.click(container.querySelector('button.card') as HTMLButtonElement);
    expect(app.page).toBe('series');
    expect(app.seriesPid).toBe(42);
  });

  it('right-click opens the context menu', async () => {
    const { container } = render(CoverCard, {
      props: { series: makeSeries({ pid: 1 }) },
    });
    const card = container.querySelector('button.card') as HTMLButtonElement;
    await fireEvent.contextMenu(card, { clientX: 50, clientY: 60 });
    flushSync();
    // Menu is portalled to document.body.
    expect(document.body.querySelector('.ctx-menu')).not.toBeNull();
  });

  it('favorite toggle action calls setSeriesFavorite', async () => {
    const series = makeSeries({ pid: 7, is_favorite: 0 });
    const { container } = render(CoverCard, { props: { series } });
    await fireEvent.contextMenu(container.querySelector('button.card') as HTMLButtonElement);
    flushSync();
    // First .ctx-item in the portalled menu is the favorite toggle.
    const favBtn = document.body.querySelector('.ctx-menu .ctx-item') as HTMLButtonElement;
    await fireEvent.click(favBtn);
    expect(setSeriesFavorite).toHaveBeenCalledWith(7, true);
  });

  it('status pill action calls setReadingStatus', async () => {
    const series = makeSeries({ pid: 9, reading_status: null });
    const { container } = render(CoverCard, { props: { series } });
    await fireEvent.contextMenu(container.querySelector('button.card') as HTMLButtonElement);
    flushSync();
    const statusBtns = document.body.querySelectorAll('.ctx-menu .ctx-status');
    expect(statusBtns.length).toBeGreaterThan(0);
    await fireEvent.click(statusBtns[0] as HTMLButtonElement);
    expect(setReadingStatus).toHaveBeenCalled();
    expect(setReadingStatus.mock.calls[0][0]).toBe(9);
  });

  it('Escape key closes context menu', async () => {
    const { container } = render(CoverCard, { props: { series: makeSeries() } });
    await fireEvent.contextMenu(container.querySelector('button.card') as HTMLButtonElement);
    flushSync();
    expect(document.body.querySelector('.ctx-menu')).not.toBeNull();
    await fireEvent.keyDown(window, { key: 'Escape' });
    flushSync();
    await waitFor(() => {
      expect(document.body.querySelector('.ctx-menu')).toBeNull();
    });
  });
});
