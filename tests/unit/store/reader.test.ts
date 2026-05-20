import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  setReaderBrightness,
  setReaderWarmth,
  setLastReader,
  dismissContinue,
  restoreContinue,
  updateLastReaderPage,
  openReader,
  setReaderChapters,
  readerNext,
  readerPrev,
  readerHasNext,
  readerHasPrev,
  peekNextDownloadedChapter,
  seedLastReader,
  resumeLastReader,
} from '../../../src/shared/lib/store/reader.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';
import type { Chapter } from '../../../src/shared/lib/types';

const mockInvoke = vi.mocked(invoke);

function ch(id: string, no: number, downloaded = 1): Chapter {
  return {
    chapter_id: id,
    pid: 1,
    chapter_no: no,
    title: `Ch ${no}`,
    is_downloaded: downloaded,
    pdf_path: `/p/${id}.pdf`,
    page_count: 10,
    release_date: null,
    last_page_read: null,
    read_at: null,
  };
}

beforeEach(() => {
  app.readerChapter = null;
  app.readerChapters = [];
  app.lastReader = null;
  app.continueDismissed = false;
  app.readerBrightness = 1;
  app.readerWarmth = 0;
  mockInvoke.mockReset();
});

describe('brightness/warmth setters', () => {
  it('clamps brightness to [0.3, 1]', () => {
    setReaderBrightness(2);
    expect(app.readerBrightness).toBe(1);
    setReaderBrightness(0.1);
    expect(app.readerBrightness).toBe(0.3);
  });
  it('persists brightness', () => {
    setReaderBrightness(0.5);
    expect(localStorage.getItem('aan.reader.brightness')).toBe('0.5');
  });
  it('clamps warmth to [0, 0.6]', () => {
    setReaderWarmth(99);
    expect(app.readerWarmth).toBe(0.6);
    setReaderWarmth(-1);
    expect(app.readerWarmth).toBe(0);
  });
  it('persists warmth', () => {
    setReaderWarmth(0.3);
    expect(localStorage.getItem('aan.reader.warmth')).toBe('0.3');
  });
});

describe('continue flags', () => {
  it('dismiss + restore', () => {
    dismissContinue();
    expect(app.continueDismissed).toBe(true);
    restoreContinue();
    expect(app.continueDismissed).toBe(false);
  });
});

describe('setLastReader + updateLastReaderPage', () => {
  it('persists last reader', () => {
    setLastReader({ pid: 1, chapterId: 'c1', seriesName: 'S', chapterNo: 2, kind: 'manga' });
    expect(app.lastReader?.chapterId).toBe('c1');
    expect(JSON.parse(localStorage.getItem('aan.last_reader')!).pid).toBe(1);
  });

  it('updateLastReaderPage no-ops when chapter mismatches', () => {
    setLastReader({ pid: 1, chapterId: 'c1', seriesName: 'S', chapterNo: 1, kind: 'manga', lastPage: 3 });
    updateLastReaderPage('OTHER', 7);
    expect(app.lastReader?.lastPage).toBe(3);
  });

  it('updateLastReaderPage updates when chapter matches', () => {
    setLastReader({ pid: 1, chapterId: 'c1', seriesName: 'S', chapterNo: 1, kind: 'manga', lastPage: 1 });
    updateLastReaderPage('c1', 9);
    expect(app.lastReader?.lastPage).toBe(9);
  });
});

describe('openReader + setReaderChapters', () => {
  it('opens a chapter and marks reader page', () => {
    openReader(ch('c1', 1));
    expect(app.page).toBe('reader');
    expect(app.readerChapter?.chapter_id).toBe('c1');
    expect(app.navDir).toBe('forward');
  });

  it('setReaderChapters assigns the list', () => {
    setReaderChapters([ch('a', 1), ch('b', 2)]);
    expect(app.readerChapters.length).toBe(2);
  });
});

describe('reader navigation (next/prev/peek)', () => {
  // readerChapters is DESC by chapter_no.
  const chapters = () => [ch('c3', 3), ch('c2', 2, 0), ch('c1', 1)];

  it('readerNext walks toward newer chapters skipping non-downloaded', () => {
    setReaderChapters(chapters());
    openReader(chapters()[2]); // start at c1
    expect(readerNext()).toBe(true);
    expect(app.readerChapter?.chapter_id).toBe('c3');
  });

  it('readerPrev walks toward older chapters', () => {
    setReaderChapters(chapters());
    openReader(chapters()[0]); // start at c3
    expect(readerPrev()).toBe(true);
    expect(app.readerChapter?.chapter_id).toBe('c1');
  });

  it('readerHasNext / readerHasPrev reflect availability', () => {
    setReaderChapters(chapters());
    openReader(chapters()[2]);
    expect(readerHasNext()).toBe(true);
    expect(readerHasPrev()).toBe(false);
  });

  it('peekNextDownloadedChapter returns next without navigating', () => {
    setReaderChapters(chapters());
    openReader(chapters()[2]);
    const peek = peekNextDownloadedChapter();
    expect(peek?.chapterId).toBe('c3');
    // No mutation:
    expect(app.readerChapter?.chapter_id).toBe('c1');
  });

  it('readerNext returns false when none available', () => {
    setReaderChapters([ch('only', 1)]);
    openReader(ch('only', 1));
    expect(readerNext()).toBe(false);
  });

  it('readerPrev returns false at oldest', () => {
    setReaderChapters([ch('only', 1)]);
    openReader(ch('only', 1));
    expect(readerPrev()).toBe(false);
  });

  it('returns false when current chapter is not in list', () => {
    setReaderChapters([ch('a', 1)]);
    app.readerChapter = ch('orphan', 9);
    expect(readerNext()).toBe(false);
    expect(readerPrev()).toBe(false);
    expect(readerHasNext()).toBe(false);
    expect(readerHasPrev()).toBe(false);
    expect(peekNextDownloadedChapter()).toBeNull();
  });
});

describe('seedLastReader', () => {
  it('clears stale lastReader when chapter no longer exists', async () => {
    setLastReader({ pid: 1, chapterId: 'gone', seriesName: 'S', chapterNo: 1, kind: 'manga' });
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_chapters') return [];
      if (cmd === 'list_recent_reads') return [];
      return [];
    });
    await seedLastReader();
    expect(app.lastReader).toBeNull();
  });

  it('seeds from recent reads when none stored', async () => {
    app.lastReader = null;
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_recent_reads') {
        return [{ pid: 7, chapter_id: 'c7', series_name: 'X', chapter_no: 4, kind: 'novel',
                  cover_path: null, chapter_title: '', page_count: 0, last_page_read: 0, read_at: '' }];
      }
      return [];
    });
    await seedLastReader();
    expect(app.lastReader?.pid).toBe(7);
  });
});

describe('resumeLastReader', () => {
  it('returns false when no lastReader', async () => {
    expect(await resumeLastReader()).toBe(false);
  });

  it('returns false when chapter is gone', async () => {
    setLastReader({ pid: 1, chapterId: 'gone', seriesName: 'S', chapterNo: 1, kind: 'manga' });
    mockInvoke.mockImplementation(async (cmd: string) => (cmd === 'list_chapters' ? [] : []));
    expect(await resumeLastReader()).toBe(false);
  });

  it('opens reader on successful resume', async () => {
    setLastReader({ pid: 1, chapterId: 'c1', seriesName: 'S', chapterNo: 1, kind: 'manga' });
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'list_chapters') return [ch('c1', 1)];
      return [];
    });
    const ok = await resumeLastReader();
    expect(ok).toBe(true);
    expect(app.page).toBe('reader');
  });
});
