import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import BookmarksMenu from '../../../src/features/reader/BookmarksMenu.svelte';
import { makeBookmark } from '../helpers';

function baseProps(over: Partial<Record<string, unknown>> = {}) {
  return {
    bookmarks: [] as ReturnType<typeof makeBookmark>[],
    currentPage: 5,
    currentBookmarked: false,
    onToggleHere: vi.fn(),
    onJump: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
}

describe('BookmarksMenu', () => {
  it('toggle button fires onToggleHere', async () => {
    const onToggleHere = vi.fn();
    const { container } = render(BookmarksMenu, { props: baseProps({ onToggleHere }) });
    await fireEvent.click(container.querySelector('button.bm-toggle') as HTMLButtonElement);
    expect(onToggleHere).toHaveBeenCalledOnce();
  });

  it('toggle button shows the "on" class when currentBookmarked=true', () => {
    const { container } = render(BookmarksMenu, { props: baseProps({ currentBookmarked: true }) });
    expect(container.querySelector('button.bm-toggle.on')).not.toBeNull();
  });

  it('list-toggle is hidden when no bookmarks', () => {
    const { container } = render(BookmarksMenu, { props: baseProps() });
    expect(container.querySelector('button.bm-list-toggle')).toBeNull();
  });

  it('list-toggle shows the bookmark count', () => {
    const bookmarks = [makeBookmark({ id: 1, page: 3 }), makeBookmark({ id: 2, page: 7 })];
    const { container } = render(BookmarksMenu, { props: baseProps({ bookmarks }) });
    expect(container.querySelector('button.bm-list-toggle')?.textContent).toContain('2');
  });

  it('opening the menu reveals one item per bookmark (portalled)', async () => {
    const bookmarks = [makeBookmark({ id: 1, page: 3 }), makeBookmark({ id: 2, page: 8, note: 'cliff' })];
    const { container } = render(BookmarksMenu, { props: baseProps({ bookmarks }) });
    await fireEvent.click(container.querySelector('button.bm-list-toggle') as HTMLButtonElement);
    flushSync();
    const items = document.body.querySelectorAll('.bm-menu .bm-item');
    expect(items.length).toBe(2);
    expect(document.body.querySelector('.bm-note')?.textContent).toBe('cliff');
  });

  it('clicking an item fires onJump with its page', async () => {
    const onJump = vi.fn();
    const bookmarks = [makeBookmark({ id: 1, page: 12 })];
    const { container } = render(BookmarksMenu, { props: baseProps({ bookmarks, onJump }) });
    await fireEvent.click(container.querySelector('button.bm-list-toggle') as HTMLButtonElement);
    flushSync();
    await fireEvent.click(document.body.querySelector('.bm-menu .bm-item') as HTMLButtonElement);
    expect(onJump).toHaveBeenCalledWith(12);
  });

  it('clicking delete fires onDelete with the bookmark id', async () => {
    const onDelete = vi.fn();
    const bookmarks = [makeBookmark({ id: 42, page: 3 })];
    const { container } = render(BookmarksMenu, { props: baseProps({ bookmarks, onDelete }) });
    await fireEvent.click(container.querySelector('button.bm-list-toggle') as HTMLButtonElement);
    flushSync();
    await fireEvent.click(document.body.querySelector('.bm-menu .bm-del') as HTMLButtonElement);
    expect(onDelete).toHaveBeenCalledWith(42);
  });
});
