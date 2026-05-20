// Vitest global setup. Stub Tauri invoke so unit tests never hit the IPC layer
// (the real layer requires a Tauri runtime that isn't present under jsdom).
import { vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (_cmd: string, _args?: unknown) => {
    // Default: resolve with a sensible empty value. Individual tests override
    // via vi.mocked(invoke).mockResolvedValueOnce(...).
    return [] as unknown;
  }),
}));

// jsdom doesn't implement Element.animate — stub it so Svelte transitions
// don't blow up under render(). Returns a faux Animation handle.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function () {
    const listeners: Record<string, Array<() => void>> = {};
    const anim: any = {
      cancel() {}, play() {}, pause() {}, reverse() {},
      onfinish: null, oncancel: null,
      currentTime: 0, playbackRate: 1,
      addEventListener(ev: string, cb: () => void) {
        (listeners[ev] ||= []).push(cb);
      },
      removeEventListener(ev: string, cb: () => void) {
        listeners[ev] = (listeners[ev] || []).filter((f) => f !== cb);
      },
      finish() {
        (listeners['finish'] || []).forEach((f) => f());
        if (typeof anim.onfinish === 'function') anim.onfinish();
      },
    };
    anim.finished = Promise.resolve(anim);
    queueMicrotask(() => anim.finish());
    return anim as unknown as Animation;
  };
}

// jsdom keeps localStorage between tests; reset it so persistence checks
// don't bleed across cases.
beforeEach(() => {
  try { localStorage.clear(); } catch {}
});
