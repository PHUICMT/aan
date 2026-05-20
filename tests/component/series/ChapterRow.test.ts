import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/shared/lib/api', () => ({
  convertChapterToPdf: vi.fn(async () => 'C:/x.pdf'),
  convertChapterToImages: vi.fn(async () => 'C:/x_dir'),
}));

import ChapterRow from '../../../src/features/series/ChapterRow.svelte';
import { app } from '../../../src/shared/lib/store.svelte';
import { makeChapter } from '../helpers';

describe('ChapterRow', () => {
  it('renders chapter number and title', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ chapter_no: 4, title: 'Adventure' }),
        seriesName: 'X',
        kind: 'manga',
      },
    });
    expect(container.querySelector('.no')?.textContent).toContain('4');
    expect(container.querySelector('.title-text')?.textContent).toBe('Adventure');
  });

  it('PDF chapter shows the PDF format chip', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ pdf_path: 'C:/x.pdf', is_downloaded: 1 }),
        seriesName: 'X', kind: 'manga',
      },
    });
    expect(container.querySelector('.fmt-chip.pdf')?.textContent).toBe('PDF');
  });

  it('HTML chapter shows the HTML format chip', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ pdf_path: 'C:/x.html', is_downloaded: 1 }),
        seriesName: 'X', kind: 'novel',
      },
    });
    expect(container.querySelector('.fmt-chip.html')?.textContent).toBe('HTML');
  });

  it('image-dir chapter shows the IMG format chip', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ pdf_path: 'C:/x_dir', is_downloaded: 1 }),
        seriesName: 'X', kind: 'manga',
      },
    });
    expect(container.querySelector('.fmt-chip.img')?.textContent).toBe('IMG');
  });

  it('non-downloaded chapter hides the read button', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ is_downloaded: 0 }),
        seriesName: 'X', kind: 'manga',
      },
    });
    expect(container.querySelector('button.read')).toBeNull();
  });

  it('clicking read button opens the reader', async () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ pid: 5, chapter_id: 'cz' }),
        seriesName: 'X', kind: 'manga',
      },
    });
    await fireEvent.click(container.querySelector('button.read') as HTMLButtonElement);
    expect(app.page).toBe('reader');
    expect(app.readerChapter?.chapter_id).toBe('cz');
  });

  it('select mode shows checkbox and fires onToggleSelect', async () => {
    const onToggleSelect = vi.fn();
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter(),
        seriesName: 'X', kind: 'manga',
        selectMode: true, selected: false, onToggleSelect,
      },
    });
    const box = container.querySelector('button.sel-box') as HTMLButtonElement;
    expect(box).not.toBeNull();
    await fireEvent.click(box);
    expect(onToggleSelect).toHaveBeenCalledOnce();
  });

  it('selected chapter applies "selected" class on the row', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter(),
        seriesName: 'X', kind: 'manga',
        selectMode: true, selected: true,
      },
    });
    expect(container.querySelector('.row.selected')).not.toBeNull();
  });

  it('shows the fully-read chip when last_page_read >= page_count', () => {
    const { container } = render(ChapterRow, {
      props: {
        chapter: makeChapter({ page_count: 10, last_page_read: 10 }),
        seriesName: 'X', kind: 'manga',
      },
    });
    expect(container.querySelector('.read-chip')).not.toBeNull();
    expect(container.querySelector('.read-chip.in-progress')).toBeNull();
  });
});
