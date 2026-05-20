// Accumulates foreground reading seconds and flushes to log_reading_session.
// Only counts while document.visibilityState === 'visible'.

import { logReadingSession } from './api';

const FLUSH_INTERVAL_MS = 60_000;
const TICK_MS = 1_000;
const SESSION_CAP_S = 7200;

export type ReadingTimer = {
  stop: () => void;
  flush: () => Promise<void>;
};

export function startReadingTimer(chapterId: string | undefined | null, pid: number | undefined | null): ReadingTimer {
  let accumulated = 0;
  let lastTick = Date.now();
  let alive = true;

  function nowVisible(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'visible';
  }

  async function flush() {
    if (!chapterId || !pid) {
      accumulated = 0;
      return;
    }
    const s = Math.min(SESSION_CAP_S, Math.floor(accumulated));
    accumulated -= s;
    if (s <= 0) return;
    try { await logReadingSession(chapterId, pid, s); } catch {}
  }

  const tickId = setInterval(() => {
    if (!alive) return;
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (nowVisible() && dt > 0 && dt < 5) {
      accumulated += dt;
    }
  }, TICK_MS);

  const flushId = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);

  function onVisibility() {
    if (!nowVisible()) {
      void flush();
    } else {
      lastTick = Date.now();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  return {
    async flush() { await flush(); },
    stop() {
      alive = false;
      clearInterval(tickId);
      clearInterval(flushId);
      document.removeEventListener('visibilitychange', onVisibility);
      void flush();
    },
  };
}
