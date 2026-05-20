import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ContinueRow from '../../../src/features/home/ContinueRow.svelte';
import { makeRecentRead } from '../helpers';

describe('ContinueRow', () => {
  it('renders one card per item', () => {
    const items = [
      makeRecentRead({ chapter_id: 'c1', last_page_read: 5, page_count: 20 }),
      makeRecentRead({ chapter_id: 'c2', last_page_read: 15, page_count: 30 }),
    ];
    const { container } = render(ContinueRow, { props: { items, covers: {}, onResume: () => {} } });
    expect(container.querySelectorAll('button.continue-card').length).toBe(2);
  });

  it('progress bar widths reflect last_page_read / page_count', () => {
    const items = [
      makeRecentRead({ chapter_id: 'a', last_page_read: 5, page_count: 20 }),  // 25%
      makeRecentRead({ chapter_id: 'b', last_page_read: 15, page_count: 30 }), // 50%
      makeRecentRead({ chapter_id: 'c', last_page_read: 1, page_count: 0 }),   // 0% (guard)
    ];
    const { container } = render(ContinueRow, { props: { items, covers: {}, onResume: () => {} } });
    const fills = Array.from(container.querySelectorAll('.prog-fill')) as HTMLElement[];
    expect(fills[0].style.width).toBe('25%');
    expect(fills[1].style.width).toBe('50%');
    expect(fills[2].style.width).toBe('0%');
  });

  it('fires onResume with the clicked item', async () => {
    const onResume = vi.fn();
    const items = [makeRecentRead({ chapter_id: 'c1' })];
    const { container } = render(ContinueRow, { props: { items, covers: {}, onResume } });
    await fireEvent.click(container.querySelector('button.continue-card') as HTMLButtonElement);
    expect(onResume).toHaveBeenCalledOnce();
    expect(onResume.mock.calls[0][0].chapter_id).toBe('c1');
  });
});
