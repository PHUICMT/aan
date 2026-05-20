import { invoke } from '@tauri-apps/api/core';
import type {
  SeriesCard,
  SeriesDetail,
  Chapter,
  GenreCount,
  RecentRead,
  LibraryStats,
  ReadingStats,
  ChapterMatch,
  Bookmark,
} from './types';

export async function listLocalSeries(): Promise<SeriesCard[]> {
  return await invoke<SeriesCard[]>('list_local_series');
}

export async function getSeries(pid: number): Promise<SeriesDetail> {
  return await invoke<SeriesDetail>('get_series', { pid });
}

export async function listChapters(pid: number): Promise<Chapter[]> {
  return await invoke<Chapter[]>('list_chapters', { pid });
}

export async function readChapterBytes(pdfPath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_chapter_bytes', { pdfPath });
  return new Uint8Array(bytes);
}

export async function readCover(pid: number): Promise<Uint8Array | null> {
  try {
    const bytes = await invoke<number[] | null>('read_cover', { pid });
    if (!bytes || bytes.length === 0) return null;
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

export function coverObjectUrl(bytes: Uint8Array): string {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
}

/** Delete an "orphan" series (no downloads, not favorited, no status).
 *  Backend refuses engaged series. Returns true if deleted. */
export async function deleteOrphanSeries(pid: number): Promise<boolean> {
  return await invoke<boolean>('delete_orphan_series', { pid });
}

export async function listChapterImages(chapterPath: string): Promise<string[]> {
  return await invoke<string[]>('list_chapter_images', { chapterPath });
}

export async function readImage(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_image', { path });
  return new Uint8Array(bytes);
}

export async function openInExplorer(target: string, reveal: boolean = false): Promise<void> {
  await invoke('open_in_explorer', { target, reveal });
}

export async function openUrl(url: string): Promise<void> {
  await invoke('open_url', { url });
}

/** Mark rows whose chapter files exist on disk as downloaded. Returns rows updated. */
export async function rescanChapterFiles(pid: number, kind: string): Promise<number> {
  return await invoke<number>('rescan_chapter_files', { pid, kind });
}

export async function seriesFolder(pid: number, kind: string): Promise<string> {
  return await invoke<string>('series_folder', { pid, kind });
}

export async function listGenres(): Promise<GenreCount[]> {
  return await invoke<GenreCount[]>('list_genres');
}

export async function setChapterProgress(chapterId: string, page: number): Promise<void> {
  await invoke('set_chapter_progress', { chapterId, page });
}

/** Patch page_count when DB has it as 0 (e.g. rescanned rows). No-op otherwise. */
export async function backfillChapterPageCount(chapterId: string, pageCount: number): Promise<void> {
  try { await invoke('backfill_chapter_page_count', { chapterId, pageCount }); } catch {}
}

export async function listRecentReads(limit: number = 50): Promise<RecentRead[]> {
  return await invoke<RecentRead[]>('list_recent_reads', { limit });
}

export async function setSeriesFavorite(pid: number, fav: boolean): Promise<void> {
  await invoke('set_series_favorite', { pid, fav });
}

export async function setReadingStatus(pid: number, status: string | null): Promise<void> {
  await invoke('set_reading_status', { pid, status });
}

export async function setCloseToTray(on: boolean): Promise<void> {
  try { await invoke('set_close_to_tray', { on }); } catch {}
}

export async function listFavoriteSeries(): Promise<SeriesCard[]> {
  return await invoke<SeriesCard[]>('list_favorite_series');
}

export async function listRecentlyAdded(limit: number = 8): Promise<SeriesCard[]> {
  return await invoke<SeriesCard[]>('list_recently_added', { limit });
}

export async function listAbandoned(days: number = 30, limit: number = 6): Promise<SeriesCard[]> {
  try { return await invoke<SeriesCard[]>('list_abandoned', { days, limit }); }
  catch { return []; }
}

export async function libraryStats(): Promise<LibraryStats> {
  return await invoke<LibraryStats>('library_stats');
}

export async function readingStats(days: number = 365): Promise<ReadingStats> {
  return await invoke<ReadingStats>('reading_stats', { days });
}

export async function logReadingSession(chapterId: string, pid: number, seconds: number): Promise<void> {
  try { await invoke('log_reading_session', { chapterId, pid, seconds }); } catch {}
}

export type TopSeriesEntry = {
  pid: number;
  name: string;
  kind: string;
  seconds: number;
  chapters: number;
};

export async function topSeriesWeek(limit: number = 5): Promise<TopSeriesEntry[]> {
  return await invoke<TopSeriesEntry[]>('top_series_week', { limit });
}

export async function searchChapters(query: string, limit: number = 60): Promise<ChapterMatch[]> {
  return await invoke<ChapterMatch[]>('search_chapters', { query, limit });
}

export async function addBookmark(chapterId: string, page: number, note: string = ''): Promise<number> {
  return await invoke<number>('add_bookmark', { chapterId, page, note });
}

export async function removeBookmark(id: number): Promise<void> {
  await invoke('remove_bookmark', { id });
}

export async function listBookmarks(chapterId: string): Promise<Bookmark[]> {
  return await invoke<Bookmark[]>('list_bookmarks', { chapterId });
}

export async function convertChapterToPdf(chapterId: string): Promise<string> {
  return await invoke<string>('convert_chapter_to_pdf', { chapterId });
}

export async function convertChapterToImages(chapterId: string): Promise<string> {
  return await invoke<string>('convert_chapter_to_images', { chapterId });
}

// ───────────────────────────────────────────────────────────────
// Data folder (config + move with pause/resume)
// ───────────────────────────────────────────────────────────────

export type DataFolderInfo = {
  current: string;
  default: string;
  is_custom: boolean;
};

export type MoveStatus = 'running' | 'paused' | 'done' | 'failed' | 'cancelled';

export type MoveJob = {
  source: string;
  dest: string;
  status: MoveStatus;
  files_done: number;
  files_total: number;
  bytes_done: number;
  bytes_total: number;
  current: string;
  errors: string[];
  started_at: string;
};

export async function getDataFolderInfo(): Promise<DataFolderInfo> {
  return await invoke<DataFolderInfo>('get_data_folder_info');
}

export async function setDataFolder(path: string | null): Promise<void> {
  await invoke('set_data_folder', { path });
}

export async function moveDataStatus(): Promise<MoveJob | null> {
  try { return await invoke<MoveJob | null>('move_data_status'); }
  catch { return null; }
}

export async function startMoveData(dest: string): Promise<void> {
  await invoke('start_move_data', { dest });
}

export async function pauseMoveData(): Promise<void> {
  await invoke('pause_move_data');
}

export async function cancelMoveData(deletePartial: boolean): Promise<void> {
  await invoke('cancel_move_data', { deletePartial });
}

export async function finalizeMoveData(deleteSource: boolean): Promise<void> {
  await invoke('finalize_move_data', { deleteSource });
}

export type SeriesPatch = {
  name?: string;
  alias?: string;
  info?: string;
  authorName?: string;
  artistName?: string;
  status?: number;
};

export async function updateSeries(pid: number, patch: SeriesPatch): Promise<void> {
  await invoke('update_series', {
    pid,
    patch: {
      name: patch.name,
      alias: patch.alias,
      info: patch.info,
      author_name: patch.authorName,
      artist_name: patch.artistName,
      status: patch.status,
    },
  });
}

export async function deleteSeriesForce(pid: number): Promise<void> {
  await invoke('delete_series_force', { pid });
}

export async function setSeriesCover(pid: number, bytes: Uint8Array | number[]): Promise<void> {
  const arr = bytes instanceof Uint8Array ? Array.from(bytes) : bytes;
  await invoke('set_series_cover', { pid, bytes: arr });
}

export async function readCoverSource(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_cover_source', { path });
  return new Uint8Array(bytes);
}

// ── Watch folders ──────────────────────────────────────────────────────

export async function listWatchFolders(): Promise<string[]> {
  return await invoke<string[]>('list_watch_folders');
}

export async function addWatchFolder(path: string): Promise<void> {
  await invoke('add_watch_folder', { path });
}

export async function removeWatchFolder(path: string): Promise<void> {
  await invoke('remove_watch_folder', { path });
}

export type ChapterPatch = { title?: string; chapterNo?: number };

export async function updateChapter(chapterId: string, patch: ChapterPatch): Promise<void> {
  await invoke('update_chapter', {
    chapterId,
    patch: { title: patch.title, chapter_no: patch.chapterNo },
  });
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await invoke('delete_chapter', { chapterId });
}

export type PdfImportArgs = {
  srcPath: string;
  seriesName: string;
  kind: 'manga' | 'comic' | 'novel' | 'original_novel';
  chapterNo: number;
  chapterTitle: string;
  pageCount: number;
  coverBytes?: number[] | null;
};

export type ImportedChapter = {
  pid: number;
  chapter_id: string;
  created_series: boolean;
};

export async function readImportPdf(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_import_pdf', { path });
  return new Uint8Array(bytes);
}

export async function importPdf(input: PdfImportArgs): Promise<ImportedChapter> {
  return await invoke<ImportedChapter>('import_pdf', {
    args: {
      src_path: input.srcPath,
      series_name: input.seriesName,
      kind: input.kind,
      chapter_no: input.chapterNo,
      chapter_title: input.chapterTitle,
      page_count: input.pageCount,
      cover_bytes: input.coverBytes ?? null,
    },
  });
}

export type ArchiveImportArgs = {
  srcPath: string;
  seriesName: string;
  kind: 'manga' | 'comic' | 'novel' | 'original_novel';
  chapterNo: number;
  chapterTitle: string;
};

export async function importCbz(input: ArchiveImportArgs): Promise<ImportedChapter> {
  return await invoke<ImportedChapter>('import_cbz', {
    args: {
      src_path: input.srcPath,
      series_name: input.seriesName,
      kind: input.kind,
      chapter_no: input.chapterNo,
      chapter_title: input.chapterTitle,
    },
  });
}

export async function importTxt(input: ArchiveImportArgs): Promise<ImportedChapter> {
  return await invoke<ImportedChapter>('import_txt', {
    args: {
      src_path: input.srcPath,
      series_name: input.seriesName,
      kind: input.kind,
      chapter_no: input.chapterNo,
      chapter_title: input.chapterTitle,
    },
  });
}

export type EpubImportArgs = {
  srcPath: string;
  seriesNameOverride?: string | null;
  kind: 'novel' | 'original_novel';
};

export type ImportedEpub = {
  pid: number;
  created_series: boolean;
  chapters_added: number;
};

export async function importEpub(input: EpubImportArgs): Promise<ImportedEpub> {
  return await invoke<ImportedEpub>('import_epub', {
    args: {
      src_path: input.srcPath,
      series_name_override: input.seriesNameOverride ?? null,
      kind: input.kind,
    },
  });
}

export async function getSeriesReaderPrefs(pid: number): Promise<string | null> {
  return await invoke<string | null>('get_series_reader_prefs', { pid });
}
export async function setSeriesReaderPrefs(pid: number, json: string): Promise<void> {
  await invoke('set_series_reader_prefs', { pid, json });
}
export async function clearSeriesReaderPrefs(pid: number): Promise<void> {
  await invoke('clear_series_reader_prefs', { pid });
}

export type CustomFont = { family: string; filename: string; path: string; bytes: number };

export async function listCustomFonts(): Promise<CustomFont[]> {
  return await invoke<CustomFont[]>('list_custom_fonts');
}
export async function installFont(srcPath: string): Promise<CustomFont> {
  return await invoke<CustomFont>('install_font', { srcPath });
}
export async function removeCustomFont(filename: string): Promise<void> {
  await invoke('remove_custom_font', { filename });
}
export async function readCustomFontBytes(filename: string): Promise<Uint8Array> {
  const arr = await invoke<number[]>('read_custom_font', { filename });
  return new Uint8Array(arr);
}

export async function importImageFolder(input: ArchiveImportArgs): Promise<ImportedChapter> {
  return await invoke<ImportedChapter>('import_image_folder', {
    args: {
      src_path: input.srcPath,
      series_name: input.seriesName,
      kind: input.kind,
      chapter_no: input.chapterNo,
      chapter_title: input.chapterTitle,
    },
  });
}
