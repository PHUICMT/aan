// Ctrl+wheel zoom level + drag-to-pan when zoom > 1.
// Uses CSS `zoom` (set by the host component) so native scroll handles overflow.
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;

function loadPref(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export function useReaderZoom(opts: {
  getRoot: () => HTMLElement | null;
  getScrollContainer: () => HTMLElement | null;
}) {
  let zoom = $state<number>(((): number => {
    const v = parseFloat(loadPref('aan.reader.zoom', '1'));
    return Number.isFinite(v) && v >= ZOOM_MIN && v <= ZOOM_MAX ? v : 1;
  })());

  function setZoom(z: number) {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
    try { localStorage.setItem('aan.reader.zoom', String(zoom)); } catch {}
  }
  function zoomIn()  { setZoom(zoom + ZOOM_STEP); }
  function zoomOut() { setZoom(zoom - ZOOM_STEP); }
  function zoomReset() { setZoom(1); }

  function onWheelZoom(e: WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    const before = zoom;
    const after = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((before + dir * ZOOM_STEP) * 100) / 100));
    const rootEl = opts.getRoot();
    const scrollContainer = opts.getScrollContainer();
    if (rootEl && scrollContainer && after !== before) {
      const ratio = after / before;
      const rect = scrollContainer.getBoundingClientRect();
      const cx = e.clientX - rect.left + scrollContainer.scrollLeft;
      const cy = e.clientY - rect.top + scrollContainer.scrollTop;
      setZoom(after);
      requestAnimationFrame(() => {
        const sc = opts.getScrollContainer();
        if (!sc) return;
        sc.scrollLeft = cx * ratio - (e.clientX - rect.left);
        sc.scrollTop = cy * ratio - (e.clientY - rect.top);
      });
    } else {
      setZoom(after);
    }
  }

  // Drag-to-pan.
  let panning = $state(false);
  let panStartX = 0, panStartY = 0;
  let panScrollX = 0, panScrollY = 0;
  function onPanDown(e: MouseEvent) {
    if (zoom <= 1) return;
    if (e.button !== 0) return;
    const tg = e.target as HTMLElement | null;
    if (tg && (tg.tagName === 'BUTTON' || tg.tagName === 'INPUT' || tg.closest('.reader-bar'))) return;
    const sc = opts.getScrollContainer();
    if (!sc) return;
    panning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panScrollX = sc.scrollLeft;
    panScrollY = sc.scrollTop;
    e.preventDefault();
  }
  function onPanMove(e: MouseEvent) {
    if (!panning) return;
    const sc = opts.getScrollContainer();
    if (!sc) return;
    sc.scrollLeft = panScrollX - (e.clientX - panStartX);
    sc.scrollTop  = panScrollY - (e.clientY - panStartY);
  }
  function onPanUp() { panning = false; }

  return {
    get zoom() { return zoom; },
    get panning() { return panning; },
    setZoom, zoomIn, zoomOut, zoomReset,
    onWheelZoom, onPanDown, onPanMove, onPanUp,
  };
}
