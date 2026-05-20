import { app, getReaderFlush } from './state.svelte';
import type { Chapter, PageId, ReadingStatus } from '../types';

export function navigate(p: PageId) {
  if (app.page !== p) app.prevPage = app.page;
  app.navDir = 'forward';
  app.page = p;
}

export function openSeries(pid: number) {
  app.prevPage = app.page;
  app.seriesPid = pid;
  app.navDir = 'forward';
  app.page = 'series';
}

export function openList(status: ReadingStatus) {
  app.prevPage = app.page;
  app.listStatus = status;
  app.navDir = 'forward';
  app.page = 'list';
}

export function toggleShortcuts() {
  app.shortcutsOpen = !app.shortcutsOpen;
}
export function closeShortcuts() {
  app.shortcutsOpen = false;
}

//───── Navigation ─────

export async function goBack() {
  const readerFlush = getReaderFlush();
  if (readerFlush) {
    try { await readerFlush(); } catch {}
  }
  app.navDir = 'back';
  if (app.page === 'reader') {
    app.page =
      app.prevPage === 'history' || app.prevPage === 'home'
        ? app.prevPage
        : 'series';
  } else if (app.page === 'series') {
    app.page =
      app.prevPage === 'favorites' || app.prevPage === 'history' || app.prevPage === 'home' || app.prevPage === 'list'
        ? app.prevPage
        : 'library';
  } else {
    app.page = 'home';
  }
}

// Re-export so openReader (defined in reader module) can be imported from nav too if needed.
export type { Chapter };
