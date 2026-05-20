// Debounced save of currentPage to DB + last-page flush + 80% prefetch trigger.
// Returns flushProgress() which the host wires into goBack, blur, beforeunload.
import {
  setChapterProgress,
} from '../../../shared/lib/api';
import {
  bumpChapterProgress, updateLastReaderPage,
  readerHasNext, peekNextDownloadedChapter,
} from '../../../shared/lib/store.svelte';
import { prefetchChapterBytes, hasPrefetched } from '../../../shared/lib/prefetch';

export function useReaderProgress(opts: {
  getChapterId: () => string | undefined;
  getPageCount: () => number;
  getCurrentPage: () => number;
  getLoading: () => boolean;
}) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let finishedFired = $state(false);

  $effect(() => {
    const chapterId = opts.getChapterId();
    const pageCount = opts.getPageCount();
    const loading = opts.getLoading();
    const currentPage = opts.getCurrentPage();
    if (loading || !chapterId || pageCount === 0) return;
    const pageSnapshot = currentPage;
    updateLastReaderPage(chapterId, pageSnapshot);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void setChapterProgress(chapterId, pageSnapshot)
        .then(() => bumpChapterProgress())
        .catch(() => {});
    }, 600);
  });

  // ~80% progress prefetch hook.
  $effect(() => {
    const loading = opts.getLoading();
    const pageCount = opts.getPageCount();
    const currentPage = opts.getCurrentPage();
    if (loading || pageCount === 0) return;
    if (currentPage / pageCount < 0.8) return;
    if (!readerHasNext()) return;
    const next = peekNextDownloadedChapter();
    if (next && !hasPrefetched(next.chapterId)) {
      prefetchChapterBytes(next.chapterId, next.pdfPath);
    }
  });

  // Last-page flush — resume should land on the final page immediately.
  $effect(() => {
    const chapterId = opts.getChapterId();
    const pageCount = opts.getPageCount();
    const currentPage = opts.getCurrentPage();
    const loading = opts.getLoading();
    if (loading || !chapterId || pageCount === 0) {
      finishedFired = false;
      return;
    }
    if (currentPage >= pageCount && !finishedFired) {
      finishedFired = true;
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      void setChapterProgress(chapterId, pageCount).catch(() => {});
    }
  });

  async function flushProgress() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    const chapterId = opts.getChapterId();
    const pageCount = opts.getPageCount();
    const currentPage = opts.getCurrentPage();
    if (chapterId && pageCount > 0) {
      try {
        await setChapterProgress(chapterId, currentPage);
        bumpChapterProgress();
      } catch {}
    }
  }
  function destroyFlush() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    // Backstop fire-and-forget on unmount.
    const chapterId = opts.getChapterId();
    const pageCount = opts.getPageCount();
    const currentPage = opts.getCurrentPage();
    if (chapterId && pageCount > 0) {
      void setChapterProgress(chapterId, currentPage)
        .then(() => bumpChapterProgress())
        .catch(() => {});
    }
  }

  return { flushProgress, destroyFlush };
}
