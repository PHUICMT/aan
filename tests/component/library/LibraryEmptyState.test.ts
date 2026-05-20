import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import LibraryEmptyState from '../../../src/features/library/LibraryEmptyState.svelte';

describe('LibraryEmptyState', () => {
  it('error state renders error message with provided message', () => {
    const { container } = render(LibraryEmptyState, { props: { state: 'error', error: 'boom' } });
    const el = container.querySelector('.empty.error') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('boom');
  });

  it('loading state renders skeleton cards when skeletonCount > 0', () => {
    const { container } = render(LibraryEmptyState, { props: { state: 'loading', skeletonCount: 4 } });
    expect(container.querySelectorAll('.card-skel').length).toBe(4);
  });

  it('loading state with skeletonCount=0 renders nothing', () => {
    const { container } = render(LibraryEmptyState, { props: { state: 'loading', skeletonCount: 0 } });
    expect(container.querySelector('.empty')).toBeNull();
    expect(container.querySelectorAll('.card-skel').length).toBe(0);
  });

  it('empty state renders empty message + hint', () => {
    const { container } = render(LibraryEmptyState, { props: { state: 'empty' } });
    const el = container.querySelector('.empty');
    expect(el).not.toBeNull();
    expect(el?.querySelector('.hint')).not.toBeNull();
  });

  it('passes viewMode to the skeleton grid', () => {
    const { container } = render(LibraryEmptyState, {
      props: { state: 'loading', skeletonCount: 2, viewMode: 'compact' },
    });
    expect(container.querySelector('.grid.mode-compact')).not.toBeNull();
  });
});
