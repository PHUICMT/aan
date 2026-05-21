import { app } from './state.svelte';
import type { LastReader } from './state.svelte';
import type { Chapter } from '../types';
import { listChapters, listRecentReads } from '../api';

export function setReaderBrightness(v: number) {
  app.readerBrightness = Math.min(1, Math.max(0.3, v));
  try { localStorage.setItem('aan.reader.brightness', String(app.readerBrightness)); } catch {}
}
export function setReaderWarmth(v: number) {
  app.readerWarmth = Math.min(0.6, Math.max(0, v));
  try { localStorage.setItem('aan.reader.warmth', String(app.readerWarmth)); } catch {}
}

export function setPdfLoadMode(v: 'lazy' | 'eager') {
  app.pdfLoadMode = v;
  try { localStorage.setItem('aan.reader.pdf_load_mode', v); } catch {}
}

export function setLastReader(info: LastReader) {
  app.lastReader = info;
  try { localStorage.setItem('aan.last_reader', JSON.stringify(info)); } catch {}
}

/** Mark the current lastReader series as already-seen so the Continue
 *  pill stops re-appearing for it. Triggered by the dismiss button and
 *  also implicitly by opening the reader. */
export function markContinueSeen() {
  const pid = app.lastReader?.pid ?? null;
  app.continueSeenPid = pid;
  try {
    if (pid == null) localStorage.removeItem('aan.continue_seen_pid');
    else localStorage.setItem('aan.continue_seen_pid', String(pid));
  } catch {}
}

/** Mark current page so Continue-pill resumes there. */
export function updateLastReaderPage(chapterId: string, page: number) {
  const lr = app.lastReader;
  if (!lr || lr.chapterId !== chapterId) return;
  if (lr.lastPage === page) return;
  const info = { ...lr, lastPage: page };
  app.lastReader = info;
  try { localStorage.setItem('aan.last_reader', JSON.stringify(info)); } catch {}
}

/** Seed lastReader from DB on boot, or drop stale entries (deleted series). */
export async function seedLastReader() {
  if (app.lastReader) {
    try {
      const chs = await listChapters(app.lastReader.pid);
      const found = chs.some((c) => c.chapter_id === app.lastReader!.chapterId);
      if (!found) {
        app.lastReader = null;
        try { localStorage.removeItem('aan.last_reader'); } catch {}
      }
    } catch {
      app.lastReader = null;
      try { localStorage.removeItem('aan.last_reader'); } catch {}
    }
    if (app.lastReader) return;
  }
  try {
    const recent = await listRecentReads(1);
    if (recent.length > 0) {
      const r = recent[0];
      app.lastReader = {
        pid: r.pid,
        chapterId: r.chapter_id,
        seriesName: r.series_name,
        chapterNo: r.chapter_no,
        kind: r.kind,
      };
    }
  } catch {}
}

export async function resumeLastReader(): Promise<boolean> {
  const lr = app.lastReader;
  if (!lr) return false;
  try {
    const chs = await listChapters(lr.pid);
    const c = chs.find((x) => x.chapter_id === lr.chapterId);
    if (!c) return false;
    setReaderChapters(chs);
    openReader(c);
    return true;
  } catch {
    return false;
  }
}

export function openReader(chapter: Chapter) {
  app.prevPage = app.page;
  app.readerChapter = chapter;
  app.navDir = 'forward';
  app.page = 'reader';
  // Opening the reader implicitly acknowledges the pill for this series;
  // user is actively engaging, no need to re-prompt them later.
  app.continueSeenPid = chapter.pid;
  try { localStorage.setItem('aan.continue_seen_pid', String(chapter.pid)); } catch {}
  try {
    const prev = app.lastReader;
    const sameSeries = prev?.pid === chapter.pid;
    const sameChapter = prev?.chapterId === chapter.chapter_id;
    const carriedPage = sameChapter ? prev?.lastPage : undefined;
    const dbPage = chapter.last_page_read ?? undefined;
    const info: LastReader = {
      pid: chapter.pid,
      chapterId: chapter.chapter_id,
      seriesName: sameSeries ? prev!.seriesName : '',
      chapterNo: chapter.chapter_no,
      kind: sameSeries ? prev!.kind : '',
      lastPage: carriedPage ?? (typeof dbPage === 'number' ? dbPage : undefined),
    };
    app.lastReader = info;
    localStorage.setItem('aan.last_reader', JSON.stringify(info));
  } catch {}
}

export function setReaderChapters(list: Chapter[]) {
  app.readerChapters = list;
}

function currentChapterIndex(): number {
  const c = app.readerChapter;
  if (!c) return -1;
  return app.readerChapters.findIndex((x) => x.chapter_id === c.chapter_id);
}

// readerChapters is DESC by chapter_no, so next-in-reading-order = i-1.
//───── Reader chapter navigation ─────

export function readerNext(): boolean {
  const i = currentChapterIndex();
  if (i < 0) return false;
  for (let j = i - 1; j >= 0; j--) {
    if (app.readerChapters[j].is_downloaded === 1) {
      switchReaderChapter(app.readerChapters[j]);
      return true;
    }
  }
  return false;
}

export function readerPrev(): boolean {
  const i = currentChapterIndex();
  if (i < 0) return false;
  for (let j = i + 1; j < app.readerChapters.length; j++) {
    if (app.readerChapters[j].is_downloaded === 1) {
      switchReaderChapter(app.readerChapters[j]);
      return true;
    }
  }
  return false;
}

function switchReaderChapter(chapter: Chapter) {
  app.readerChapter = chapter;
  try {
    const prev = app.lastReader;
    const sameSeries = prev?.pid === chapter.pid;
    const info: LastReader = {
      pid: chapter.pid,
      chapterId: chapter.chapter_id,
      seriesName: sameSeries ? prev!.seriesName : '',
      chapterNo: chapter.chapter_no,
      kind: sameSeries ? prev!.kind : '',
      lastPage: 1,
    };
    app.lastReader = info;
    localStorage.setItem('aan.last_reader', JSON.stringify(info));
  } catch {}
}

/** Next downloaded chapter without navigating. Used by reader prefetch. */
export function peekNextDownloadedChapter(): { chapterId: string; pdfPath: string } | null {
  const i = currentChapterIndex();
  if (i < 0) return null;
  for (let j = i - 1; j >= 0; j--) {
    const c = app.readerChapters[j];
    if (c.is_downloaded === 1) return { chapterId: c.chapter_id, pdfPath: c.pdf_path };
  }
  return null;
}

export function readerHasNext(): boolean {
  const i = currentChapterIndex();
  if (i < 0) return false;
  return app.readerChapters.slice(0, i).some((c) => c.is_downloaded === 1);
}

export function readerHasPrev(): boolean {
  const i = currentChapterIndex();
  if (i < 0) return false;
  return app.readerChapters.slice(i + 1).some((c) => c.is_downloaded === 1);
}
