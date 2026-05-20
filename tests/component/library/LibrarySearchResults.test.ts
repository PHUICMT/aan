import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import LibrarySearchResults from '../../../src/features/library/LibrarySearchResults.svelte';
import { makeChapterMatch } from '../helpers';

describe('LibrarySearchResults', () => {
  it('renders one row per match', () => {
    const matches = [
      makeChapterMatch({ chapter_id: 'a', series_name: 'One', chapter_no: 1 }),
      makeChapterMatch({ chapter_id: 'b', series_name: 'Two', chapter_no: 2 }),
    ];
    const { container } = render(LibrarySearchResults, {
      props: { matches, pending: false, onOpen: () => {} },
    });
    expect(container.querySelectorAll('button.ch-row').length).toBe(2);
    expect(container.querySelector('.ch-count')?.textContent).toBe('2');
  });

  it('shows skeletons while pending with no matches', () => {
    const { container } = render(LibrarySearchResults, {
      props: { matches: [], pending: true, onOpen: () => {} },
    });
    expect(container.querySelector('.ch-skel')).not.toBeNull();
    expect(container.querySelector('ul.ch-list')).toBeNull();
  });

  it('renders list (not skel) when matches arrive even while pending', () => {
    const matches = [makeChapterMatch({ chapter_id: 'a' })];
    const { container } = render(LibrarySearchResults, {
      props: { matches, pending: true, onOpen: () => {} },
    });
    expect(container.querySelector('.ch-skel')).toBeNull();
    expect(container.querySelector('ul.ch-list')).not.toBeNull();
  });

  it('fires onOpen with the clicked match', async () => {
    const onOpen = vi.fn();
    const matches = [makeChapterMatch({ chapter_id: 'z', series_name: 'Z' })];
    const { container } = render(LibrarySearchResults, { props: { matches, pending: false, onOpen } });
    await fireEvent.click(container.querySelector('button.ch-row') as HTMLButtonElement);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen.mock.calls[0][0].chapter_id).toBe('z');
  });

  it('renders chapter title prefix when present', () => {
    const matches = [makeChapterMatch({ chapter_id: 'a', chapter_title: 'My Title' })];
    const { container } = render(LibrarySearchResults, {
      props: { matches, pending: false, onOpen: () => {} },
    });
    expect(container.querySelector('.ch-tt')?.textContent).toContain('My Title');
  });
});
