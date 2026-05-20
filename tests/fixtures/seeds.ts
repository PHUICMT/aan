// Synthetic seed data for the fixture DB.
// pid layout: 1xxx manga/comic, 2xxx novels, 3xxx partials.

export type SeriesSeed = {
  pid: number;
  name: string;
  type: 'manga' | 'comic' | 'novel' | 'original_novel';
  status: number;
  chapter_count: number;
  local_chapter_count: number;
  is_favorite: 0 | 1;
  reading_status: string | null;
  tags: string[];
  cover_path: string;
  info?: string;
  author_name?: string;
};

export type ChapterSeed = {
  chapter_id: string;
  pid: number;
  chapter_no: number;
  title: string;
  is_downloaded: 0 | 1;
  pdf_path: string;
  page_count: number;
  last_page_read?: number | null;
  read_at?: string | null;
};

export const SERIES: SeriesSeed[] = [
  {
    pid: 1001,
    name: 'Test Manga Alpha',
    type: 'manga',
    status: 1,
    chapter_count: 4,
    local_chapter_count: 4,
    is_favorite: 1,
    reading_status: 'reading',
    tags: ['Action', 'Adventure'],
    cover_path: 'covers/1001.jpg',
    info: 'Synthetic alpha manga used for reader, zoom, and spread tests.',
    author_name: 'Fixture Author',
  },
  {
    pid: 1002,
    name: 'Test Manga Beta',
    type: 'manga',
    status: 2,
    chapter_count: 0,
    local_chapter_count: 0,
    is_favorite: 0,
    reading_status: 'plan',
    tags: [],
    cover_path: 'covers/1002.jpg',
  },
  {
    pid: 1003,
    name: 'Test Manga Gamma',
    type: 'comic',
    status: 1,
    chapter_count: 1,
    local_chapter_count: 1,
    is_favorite: 0,
    reading_status: 'on_hold',
    tags: ['Sci-Fi'],
    cover_path: 'covers/1003.jpg',
  },
  {
    pid: 2001,
    name: 'Test Novel One',
    type: 'novel',
    status: 1,
    chapter_count: 2,
    local_chapter_count: 2,
    is_favorite: 1,
    reading_status: 'reading',
    tags: ['Fantasy', 'Drama'],
    cover_path: 'covers/2001.jpg',
  },
  {
    pid: 2002,
    name: 'Test Novel Two',
    type: 'original_novel',
    status: 1,
    chapter_count: 1,
    local_chapter_count: 1,
    is_favorite: 0,
    reading_status: null,
    tags: ['Slice of Life'],
    cover_path: 'covers/2002.jpg',
  },
  {
    pid: 3001,
    name: 'Test Manga Dropped',
    type: 'manga',
    status: 1,
    chapter_count: 10,
    local_chapter_count: 2,
    is_favorite: 0,
    reading_status: 'dropped',
    tags: [],
    cover_path: 'covers/3001.jpg',
  },
];

const now = '2026-05-20 10:00:00';
const earlier = '2026-05-19 21:30:00';

export const CHAPTERS: ChapterSeed[] = [
  // 1001 — manga alpha, all four downloaded
  { chapter_id: '1001-ch1', pid: 1001, chapter_no: 1, title: 'Alpha — Ch 1', is_downloaded: 1, pdf_path: 'manga/1001/ch1.pdf', page_count: 1, last_page_read: 1, read_at: now },
  { chapter_id: '1001-ch2', pid: 1001, chapter_no: 2, title: 'Alpha — Ch 2', is_downloaded: 1, pdf_path: 'manga/1001/ch2.pdf', page_count: 5, last_page_read: 3, read_at: earlier },
  { chapter_id: '1001-ch3', pid: 1001, chapter_no: 3, title: 'Alpha — Ch 3', is_downloaded: 1, pdf_path: 'manga/1001/ch3.pdf', page_count: 20 },
  { chapter_id: '1001-ch4', pid: 1001, chapter_no: 4, title: 'Alpha — Ch 4', is_downloaded: 1, pdf_path: 'manga/1001/ch4.pdf', page_count: 2 },

  // 1003 — comic gamma, one chapter, reuses ch1 PDF shape
  { chapter_id: '1003-ch1', pid: 1003, chapter_no: 1, title: 'Gamma — Ch 1', is_downloaded: 1, pdf_path: 'manga/1003/ch1.pdf', page_count: 1 },

  // 2001 — novel one, short + long
  { chapter_id: '2001-ch1', pid: 2001, chapter_no: 1, title: 'Novel One — Ch 1', is_downloaded: 1, pdf_path: 'novel/2001/ch1.html', page_count: 0, last_page_read: 0, read_at: now },
  { chapter_id: '2001-ch2', pid: 2001, chapter_no: 2, title: 'Novel One — Ch 2', is_downloaded: 1, pdf_path: 'novel/2001/ch2.html', page_count: 0 },

  // 2002 — novel two, plain text
  { chapter_id: '2002-ch1', pid: 2002, chapter_no: 1, title: 'Novel Two — Ch 1', is_downloaded: 1, pdf_path: 'novel/2002/ch1.txt', page_count: 0 },

  // 3001 — partial: 2 downloaded, rest tracked but missing
  { chapter_id: '3001-ch1', pid: 3001, chapter_no: 1, title: 'Dropped — Ch 1', is_downloaded: 1, pdf_path: 'manga/3001/ch1.pdf', page_count: 1 },
  { chapter_id: '3001-ch2', pid: 3001, chapter_no: 2, title: 'Dropped — Ch 2', is_downloaded: 1, pdf_path: 'manga/3001/ch2.pdf', page_count: 1 },
];
