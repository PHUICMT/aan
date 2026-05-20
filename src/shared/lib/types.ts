export type ReadingStatus = 'plan' | 'reading' | 'completed' | 'on_hold' | 'dropped';

export type SeriesCard = {
  pid: number;
  name: string;
  alias: string | null;
  type: 'manga' | 'comic' | 'novel' | 'original_novel' | string;
  status: number;
  cover_path: string | null;
  chapter_count: number;
  local_chapter_count: number;
  last_updated: string | null;
  tags: string[];
  is_favorite: number;
  last_read_at: string | null;
  reading_status: ReadingStatus | null;
};

export type PageId =
  | 'library'
  | 'settings'
  | 'series'
  | 'reader'
  | 'history'
  | 'favorites'
  | 'home'
  | 'list';

export type SeriesDetail = {
  pid: number;
  name: string;
  alias: string | null;
  type: string;
  status: number;
  info: string | null;
  author_name: string | null;
  artist_name: string | null;
  chapter_count: number;
  local_chapter_count: number;
  last_updated: string | null;
  last_chapter_no: number;
  tags: string[];
  is_favorite: number;
  reading_status: ReadingStatus | null;
};

export type GenreCount = {
  name: string;
  count: number;
};

export type Chapter = {
  chapter_id: string;
  pid: number;
  chapter_no: number;
  title: string;
  is_downloaded: number;
  pdf_path: string;
  page_count: number;
  release_date: string | null;
  last_page_read: number | null;
  read_at: string | null;
};

export type Bookmark = {
  id: number;
  chapter_id: string;
  page: number;
  note: string;
  created_at: string;
};

export type ChapterMatch = {
  chapter_id: string;
  pid: number;
  series_name: string;
  kind: string;
  chapter_no: number;
  chapter_title: string;
  is_downloaded: number;
  pdf_path: string;
};

export type DailyCount = { date: string; count: number };
export type ReadingStats = {
  total_read: number;
  today: number;
  week: number;
  month: number;
  daily: DailyCount[];
  total_seconds_today: number;
  total_seconds_7d: number;
  total_seconds_30d: number;
};

export type LibraryStats = {
  total_series: number;
  favorite_series: number;
  total_chapters: number;
  downloaded_chapters: number;
  read_chapters: number;
};

export type RecentRead = {
  pid: number;
  series_name: string;
  kind: string;
  cover_path: string | null;
  chapter_id: string;
  chapter_no: number;
  chapter_title: string;
  page_count: number;
  last_page_read: number;
  read_at: string;
};

export type Lang = 'en' | 'th';
