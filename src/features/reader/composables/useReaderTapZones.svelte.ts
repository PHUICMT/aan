// Svelte-driven cursor for tap zones (so we can animate pop-in/press/disabled).
// Also forwards wheel from position:fixed tap-zones (which don't bubble to
// Reader's scroll container) with an RAF lerp for a decelerating feel.

export function useReaderTapZones(opts: {
  getCurrentPage: () => number;
  getPageCount: () => number;
  getRtl: () => boolean;
  getRoot: () => HTMLElement | null;
  getScrollContainer: () => HTMLElement | null;
}) {
  let tapCursor = $state<'left' | 'right' | null>(null);
  let cursorX = $state(0);
  let cursorY = $state(0);
  let cursorPressed = $state(false);

  const cursorDisabled = $derived.by(() => {
    if (!tapCursor) return false;
    const cp = opts.getCurrentPage();
    const pc = opts.getPageCount();
    const rtl = opts.getRtl();
    const leftDis = rtl ? cp >= pc : cp <= 1;
    const rightDis = rtl ? cp <= 1 : cp >= pc;
    return tapCursor === 'left' ? leftDis : rightDis;
  });

  function tapEnter(side: 'left' | 'right', e: MouseEvent) {
    cursorX = e.clientX; cursorY = e.clientY;
    tapCursor = side;
  }
  function tapMove(e: MouseEvent) {
    cursorX = e.clientX; cursorY = e.clientY;
  }
  function tapLeave() { tapCursor = null; cursorPressed = false; }
  function tapDown() { cursorPressed = true; }
  function tapUp() { cursorPressed = false; }

  // Smooth wheel-forward.
  let smoothTargetY = 0;
  let smoothAnimating = false;
  let lastSetScrollTop = -1;
  function smoothScrollFrame(sc: HTMLElement) {
    if (lastSetScrollTop !== -1 && Math.abs(sc.scrollTop - lastSetScrollTop) > 1) {
      smoothAnimating = false;
      lastSetScrollTop = -1;
      return;
    }
    const diff = smoothTargetY - sc.scrollTop;
    if (Math.abs(diff) < 0.5) {
      sc.scrollTop = smoothTargetY;
      smoothAnimating = false;
      lastSetScrollTop = -1;
      return;
    }
    sc.scrollTop += diff * 0.22;
    lastSetScrollTop = sc.scrollTop;
    requestAnimationFrame(() => smoothScrollFrame(sc));
  }
  function findScrollParent(el: HTMLElement | null): HTMLElement | null {
    let n: HTMLElement | null = el?.parentElement ?? null;
    while (n && n !== document.body) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === 'auto' || oy === 'scroll') return n;
      n = n.parentElement;
    }
    return null;
  }
  function tapWheel(e: WheelEvent) {
    let sc = opts.getScrollContainer();
    if (!sc) {
      const root = opts.getRoot();
      if (root) sc = findScrollParent(root);
    }
    if (!sc) return;
    if (!smoothAnimating) smoothTargetY = sc.scrollTop;
    const maxY = sc.scrollHeight - sc.clientHeight;
    smoothTargetY = Math.max(0, Math.min(maxY, smoothTargetY + e.deltaY));
    sc.scrollLeft += e.deltaX;
    if (!smoothAnimating) {
      smoothAnimating = true;
      lastSetScrollTop = -1;
      requestAnimationFrame(() => smoothScrollFrame(sc!));
    }
    e.preventDefault();
  }

  return {
    get tapCursor() { return tapCursor; },
    get cursorX() { return cursorX; },
    get cursorY() { return cursorY; },
    get cursorPressed() { return cursorPressed; },
    get cursorDisabled() { return cursorDisabled; },
    tapEnter, tapMove, tapLeave, tapDown, tapUp, tapWheel,
  };
}
