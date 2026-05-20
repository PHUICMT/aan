// Shared helpers for component tests.
// jest-dom matchers are not installed; use plain assertions.
import type { SeriesCard, Chapter, RecentRead, Bookmark, ChapterMatch } from '../../src/shared/lib/types';

export function makeSeries(over: Partial<SeriesCard> = {}): SeriesCard {
  return {
    pid: 1,
    name: 'Test Series',
    alias: '',
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

export function makeChapter(over: Partial<Chapter> = {}): Chapter {
  return {
    chapter_id: 'c1',
    pid: 1,
    chapter_no: 1,
    title: 'Chapter One',
    is_downloaded: 1,
    pdf_path: 'C:/data/c1.pdf',
    page_count: 20,
    release_date: '2024-01-01 00:00:00',
    last_page_read: 0,
    read_at: null,
    ...over,
  };
}

export function makeRecentRead(over: Partial<RecentRead> = {}): RecentRead {
  return {
    pid: 1,
    series_name: 'Test Series',
    kind: 'manga',
    cover_path: null,
    chapter_id: 'c1',
    chapter_no: 1,
    chapter_title: '',
    page_count: 20,
    last_page_read: 10,
    read_at: '2024-01-02 00:00:00',
    ...over,
  };
}

export function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 1,
    chapter_id: 'c1',
    page: 5,
    note: '',
    created_at: '2024-01-01 00:00:00',
    ...over,
  };
}

export function makeChapterMatch(over: Partial<ChapterMatch> = {}): ChapterMatch {
  return {
    chapter_id: 'c1',
    pid: 1,
    series_name: 'Some Series',
    kind: 'manga',
    chapter_no: 3,
    chapter_title: 'Found',
    is_downloaded: 1,
    pdf_path: 'C:/data/c1.pdf',
    ...over,
  };
}
