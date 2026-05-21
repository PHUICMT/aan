<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import * as pdfjs from 'pdfjs-dist';
  import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  import Icon from '../../shared/components/Icon.svelte';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import ReaderToolbar from './ReaderToolbar.svelte';
  import ReaderSettingsMenu from './ReaderSettingsMenu.svelte';
  import BookmarksMenu from './BookmarksMenu.svelte';
  import ReaderTapZones from './ReaderTapZones.svelte';
  import {
    listChapterImages, readImage,
    addBookmark, removeBookmark, listBookmarks,
    backfillChapterPageCount,
  } from '../../shared/lib/api';
  import { takeChapterBytes } from '../../shared/lib/prefetch';
  import { startReadingTimer, type ReadingTimer } from '../../shared/lib/reading-time';
  import { t } from '../../shared/lib/i18n.svelte';
  import type { Bookmark } from '../../shared/lib/types';
  import {
    app, registerReaderFlush,
    readerHasNext, readerHasPrev, readerNext, readerPrev,
  } from '../../shared/lib/store.svelte';
  import { useReaderImmersive } from './composables/useReaderImmersive.svelte';
  import { useReaderZoom } from './composables/useReaderZoom.svelte';
  import { useReaderTapZones } from './composables/useReaderTapZones.svelte';
  import { useReaderProgress } from './composables/useReaderProgress.svelte';

  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  type Props = { pdfPath: string; chapterId?: string; initialPage?: number };
  let { pdfPath, chapterId, initialPage = 1 }: Props = $props();

  const RENDER_SCALE = 1.5;

  type Mode = 'continuous' | 'paged';
  type Layout = 'paged' | 'scroll';
  type Fit = 'width' | 'height' | 'natural';
  type Dpage = 'off' | 'auto' | 'always';

  function loadPref(key: string, fallback: string): string {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function savePref(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch {}
  }

  //───── Layout / mode prefs ─────
  // Legacy 'spread' migrated to paged + dpage:always — old setting now
  // lives in two newer fields with a single source of truth.
  let mode = $state<Mode>(((): Mode => {
    const v = loadPref('aan.reader.mode', 'continuous');
    if (v === 'spread') {
      savePref('aan.reader.mode', 'paged');
      savePref('aan.reader.dpage', 'always');
      return 'paged';
    }
    return v === 'paged' ? 'paged' : 'continuous';
  })());
  let layout = $state<Layout>(((): Layout => {
    const v = loadPref('aan.reader.layout', '');
    if (v === 'scroll' || v === 'paged') return v;
    return mode === 'continuous' ? 'scroll' : 'paged';
  })());
  function setLayout(l: Layout) {
    layout = l;
    try { localStorage.setItem('aan.reader.layout', l); } catch {}
    if (l === 'scroll') {
      mode = 'continuous';
    } else if (mode === 'continuous') {
      mode = 'paged';
    }
  }
  let bg = $state<'dark' | 'light'>(loadPref('aan.reader.bg', 'dark') as 'dark' | 'light');
  let anim = $state<boolean>(loadPref('aan.reader.anim', 'on') === 'on');
  let rtl = $state<boolean>(loadPref('aan.reader.rtl', 'off') === 'on');
  let fit = $state<Fit>(loadPref('aan.reader.fit', 'width') as Fit);
  let dpage = $state<Dpage>(((): Dpage => {
    const v = loadPref('aan.reader.dpage', 'off');
    return v === 'auto' || v === 'always' ? v : 'off';
  })());
  function cycleDpage() {
    dpage = dpage === 'off' ? 'auto' : dpage === 'auto' ? 'always' : 'off';
    try { localStorage.setItem('aan.reader.dpage', dpage); } catch {}
  }
  // Cover page is always rendered solo — pairing it with page 2 looks
  // wrong for typical book covers (front cover + inside page).
  const dpageCoverSolo = true;
  // Lazy aspect-ratio cache for dpage='auto'. Missing = wide (no pair).
  let pageAspect = $state<Record<number, number>>({});
  async function probeAspect(idx: number): Promise<number> {
    if (pageAspect[idx] !== undefined) return pageAspect[idx];
    if (!pdfDoc || idx < 0 || idx >= pageCount) return 1;
    try {
      const p = await pdfDoc.getPage(idx + 1);
      const vp = p.getViewport({ scale: 1 });
      const r = vp.width / vp.height;
      pageAspect = { ...pageAspect, [idx]: r };
      return r;
    } catch { return 1; }
  }
  function aspectOf(idx: number): number {
    return pageAspect[idx] ?? 1;
  }
  $effect(() => {
    if (loading || !pdfDoc || dpage !== 'auto') return;
    const i = currentPage - 1;
    void probeAspect(i);
    void probeAspect(i + 1);
  });
  function toggleRtl() {
    rtl = !rtl;
    try { localStorage.setItem('aan.reader.rtl', rtl ? 'on' : 'off'); } catch {}
  }
  function cycleFit() {
    fit = fit === 'width' ? 'height' : fit === 'height' ? 'natural' : 'width';
    try { localStorage.setItem('aan.reader.fit', fit); } catch {}
  }
  const fitLabel = $derived(
    fit === 'width' ? t('reader.fit.width')
      : fit === 'height' ? t('reader.fit.height')
      : t('reader.fit.natural'),
  );
  const fitIcon = $derived(fit === 'width' ? 'layout_grid' : fit === 'height' ? 'layout_list' : 'layout_compact');
  function toggleAnim() {
    anim = !anim;
    try { localStorage.setItem('aan.reader.anim', anim ? 'on' : 'off'); } catch {}
  }

  //───── Doc state ─────
  let pageCount = $state(0);
  let currentPage = $state(1);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let pdfDoc: pdfjs.PDFDocumentProxy | null = null;
  let imageUrls: string[] = [];
  let isImageDir = $state(false);

  let rootEl: HTMLDivElement | null = $state(null);
  let jumpValue = $state('');
  let observer: IntersectionObserver | null = null;
  let scrollContainer: HTMLElement | null = null;

  //───── Bookmarks ─────
  let bookmarks = $state<Bookmark[]>([]);
  async function refreshBookmarks() {
    if (!chapterId) return;
    try { bookmarks = await listBookmarks(chapterId); } catch { bookmarks = []; }
  }
  async function toggleBookmarkHere() {
    if (!chapterId) return;
    const existing = bookmarks.find((b) => b.page === currentPage);
    try {
      if (existing) await removeBookmark(existing.id);
      else await addBookmark(chapterId, currentPage, '');
      await refreshBookmarks();
    } catch {}
  }
  async function deleteBookmark(id: number) {
    try { await removeBookmark(id); await refreshBookmarks(); } catch {}
  }
  const currentBookmarked = $derived(bookmarks.some((b) => b.page === currentPage));
  const bookmarkedPages = $derived(new Set(bookmarks.map((b) => b.page)));

  //───── Composables ─────
  const immersive = useReaderImmersive();
  const zoomCtl = useReaderZoom({
    getRoot: () => rootEl,
    getScrollContainer: () => scrollContainer,
  });
  const tapZones = useReaderTapZones({
    getCurrentPage: () => currentPage,
    getPageCount: () => pageCount,
    getRtl: () => rtl,
    getRoot: () => rootEl,
    getScrollContainer: () => scrollContainer,
  });
  const progress = useReaderProgress({
    getChapterId: () => chapterId,
    getPageCount: () => pageCount,
    getCurrentPage: () => currentPage,
    getLoading: () => loading,
  });

  // Persist mode + bg via separate effects to mirror prior behaviour.
  $effect(() => savePref('aan.reader.mode', mode));
  $effect(() => savePref('aan.reader.bg', bg));
  // Publish reader bg so Reader.svelte topbar can match — independent of app theme.
  $effect(() => {
    document.documentElement.dataset.readerBg = bg;
    return () => { delete document.documentElement.dataset.readerBg; };
  });

  function dirName(path: string): string {
    return path.endsWith('/') ? path.slice(0, -1) : path;
  }

  async function renderPdfPage(idx: number, target: HTMLCanvasElement) {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(idx + 1);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    target.width = viewport.width;
    target.height = viewport.height;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport, canvas: target }).promise;
  }

  //───── Rendering (PDF / image-dir) ─────
  let renderedSet = $state<Set<number>>(new Set());
  const canvasNodes = new Map<number, HTMLCanvasElement>();
  function clearCanvas(node: HTMLCanvasElement) {
    const ctx = node.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, node.width, node.height);
    node.width = 0; node.height = 0;
  }
  function attachCanvas(node: HTMLCanvasElement, idx: number) {
    canvasNodes.set(idx, node);
    if (mode !== 'continuous') {
      renderPdfPage(idx, node).catch((e) => console.warn('render failed', idx, e));
    } else if (renderedSet.has(idx)) {
      renderPdfPage(idx, node).catch((e) => console.warn('render failed', idx, e));
    }
    return {
      destroy() {
        canvasNodes.delete(idx);
      },
    };
  }

  let lazyObserver: IntersectionObserver | null = null;
  function setupLazyObserver() {
    lazyObserver?.disconnect();
    lazyObserver = null;
    if (mode !== 'continuous' || isImageDir || !rootEl) return;
    const root = scrollContainer ?? null;
    lazyObserver = new IntersectionObserver((entries) => {
      let changed = false;
      const next = new Set(renderedSet);
      for (const e of entries) {
        const idx = Number((e.target as HTMLElement).dataset.idx);
        if (Number.isNaN(idx)) continue;
        if (e.isIntersecting) {
          if (!next.has(idx)) { next.add(idx); changed = true; }
        } else {
          if (next.has(idx)) {
            const node = canvasNodes.get(idx);
            if (node) clearCanvas(node);
            next.delete(idx);
            changed = true;
          }
        }
      }
      if (changed) renderedSet = next;
    }, { root, rootMargin: '500% 0px 500% 0px', threshold: 0 });
    rootEl.querySelectorAll('.page-wrap[data-idx]').forEach((el) => lazyObserver!.observe(el));
  }
  $effect(() => {
    if (mode !== 'continuous') return;
    for (const idx of renderedSet) {
      const node = canvasNodes.get(idx);
      if (node && (node.width === 0 || node.height === 0)) {
        renderPdfPage(idx, node).catch((e) => console.warn('lazy render failed', idx, e));
      }
    }
  });

  function attachImage(node: HTMLImageElement, idx: number) {
    const url = imageUrls[idx];
    let obj: string | null = null;
    if (url) {
      readImage(url)
        .then((bytes) => {
          obj = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
          node.src = obj;
        })
        .catch((e) => console.warn('image load failed', idx, e));
    }
    return {
      destroy() {
        if (obj) URL.revokeObjectURL(obj);
      },
    };
  }

  function recomputeCurrentPage() {
    if (!rootEl) return;
    const pages = rootEl.querySelectorAll('.page-wrap[data-idx]') as NodeListOf<HTMLElement>;
    if (pages.length === 0) return;
    const baseline = 80;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (const el of pages) {
      const r = el.getBoundingClientRect();
      if (r.bottom < baseline) continue;
      const dist = Math.abs(r.top - baseline);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = Number(el.dataset.idx);
      }
    }
    if (bestIdx >= 0) currentPage = bestIdx + 1;
  }

  let readingTimer: ReadingTimer | null = null;

  function findScrollParent(el: HTMLElement | null): HTMLElement | null {
    let n: HTMLElement | null = el?.parentElement ?? null;
    while (n && n !== document.body) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === 'auto' || oy === 'scroll') return n;
      n = n.parentElement;
    }
    return null;
  }

  function onScroll() {
    recomputeCurrentPage();
  }

  function setupObserver() {
    observer?.disconnect();
    scrollContainer?.removeEventListener('scroll', onScroll);
    if (!rootEl || mode !== 'continuous') return;
    observer = new IntersectionObserver(
      () => recomputeCurrentPage(),
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    rootEl.querySelectorAll('.page-wrap[data-idx]').forEach((el) => observer!.observe(el));
    scrollContainer = findScrollParent(rootEl);
    scrollContainer?.addEventListener('scroll', onScroll, { passive: true });
    recomputeCurrentPage();
    setupLazyObserver();
  }

  function scrollToPage(n: number) {
    const target = Math.min(Math.max(1, n), pageCount);
    if (mode === 'continuous') {
      const idx = target - 1;
      const el = rootEl?.querySelector(`.page-wrap[data-idx="${idx}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      if (target > currentPage) pageDir = 1;
      else if (target < currentPage) pageDir = -1;
      currentPage = target;
    }
  }

  let pageDir = $state<1 | -1>(1);

  function shouldPairAt(idx: number): boolean {
    if (idx + 1 >= pageCount) return false;
    if (dpage === 'off') return false;
    if (dpageCoverSolo && idx === 0) return false;
    if (dpage === 'always') return true;
    return aspectOf(idx) < 0.8 && aspectOf(idx + 1) < 0.8;
  }

  function pagedAdvanceStep(forward: boolean): number {
    if (mode === 'paged' && dpage !== 'off') {
      const i = currentPage - 1;
      if (forward && shouldPairAt(i)) return 2;
      if (!forward) {
        const prev = currentPage - 2 - 1;
        if (prev >= 0 && shouldPairAt(prev)) return 2;
      }
    }
    return 1;
  }
  function pagedNext() {
    pageDir = 1;
    scrollToPage(currentPage + pagedAdvanceStep(true));
  }
  function pagedPrev() {
    pageDir = -1;
    scrollToPage(currentPage - pagedAdvanceStep(false));
  }

  function onKeyDown(e: KeyboardEvent) {
    const tgt = e.target as HTMLElement | null;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        if (mode === 'continuous') scrollToPage(currentPage + 1);
        else pagedNext();
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        if (mode === 'continuous') scrollToPage(currentPage - 1);
        else pagedPrev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (mode === 'continuous') scrollToPage(currentPage + (rtl ? -1 : 1));
        else if (rtl) pagedPrev(); else pagedNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (mode === 'continuous') scrollToPage(currentPage + (rtl ? 1 : -1));
        else if (rtl) pagedNext(); else pagedPrev();
        break;
      case 'Home':
        e.preventDefault();
        scrollToPage(1);
        break;
      case 'End':
        e.preventDefault();
        scrollToPage(pageCount);
        break;
      case 'b':
      case 'B':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          void toggleBookmarkHere();
        }
        break;
      case '+':
      case '=':
        e.preventDefault();
        zoomCtl.zoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        zoomCtl.zoomOut();
        break;
      case '0':
        e.preventDefault();
        zoomCtl.zoomReset();
        break;
    }
  }

  function submitJump(e: SubmitEvent) {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n)) scrollToPage(n);
    jumpValue = '';
  }

  let modeSwap = $state(false);
  // Toolbar surfaces 3 quick view states (Paged → Continuous → Spread →…)
  // even though the underlying state is mode + dpage. "Spread" is just
  // paged with dpage forced to 'always' — settings menu still exposes
  // the finer dpage cycle (off/auto/always) for full control.
  type ViewState = 'paged' | 'continuous' | 'spread';
  const toolbarView = $derived<ViewState>(
    mode === 'continuous' ? 'continuous'
      : dpage === 'always' ? 'spread'
      : 'paged',
  );
  function cycleMode() {
    if (anim) {
      modeSwap = true;
      setTimeout(() => (modeSwap = false), 220);
    }
    // paged → continuous → spread → paged …
    if (toolbarView === 'paged') {
      mode = 'continuous';
    } else if (toolbarView === 'continuous') {
      mode = 'paged';
      dpage = 'always';
      try { localStorage.setItem('aan.reader.dpage', 'always'); } catch {}
    } else {
      // spread → paged (drop forced double-page)
      mode = 'paged';
      dpage = 'off';
      try { localStorage.setItem('aan.reader.dpage', 'off'); } catch {}
    }
    if (mode !== 'continuous') currentPage = 1;
  }

  function toggleBg() {
    bg = bg === 'dark' ? 'light' : 'dark';
  }

  $effect(() => {
    if (mode === 'continuous' && !loading) {
      tick().then(() => setupObserver());
    } else {
      observer?.disconnect();
    }
  });

  // Listener bindings that need a stable reference for removal on destroy.
  const onWheelZoomWrapped = (e: WheelEvent) => zoomCtl.onWheelZoom(e);
  const onPanDownWrapped = (e: MouseEvent) => zoomCtl.onPanDown(e);
  const onPanMoveWrapped = (e: MouseEvent) => zoomCtl.onPanMove(e);
  const onPanUpWrapped = () => zoomCtl.onPanUp();
  const onKeyDownWindow = (e: KeyboardEvent) => { immersive.nudgeControls(); onKeyDown(e); };
  const onMouseMoveWindow = () => immersive.nudgeControls();
  const flushWrapped = () => { void progress.flushProgress(); };

  onMount(async () => {
    try {
      isImageDir = !pdfPath.toLowerCase().endsWith('.pdf');
      if (isImageDir) {
        const files = await listChapterImages(pdfPath);
        if (files.length === 0) throw new Error('chapter has no images');
        imageUrls = files.map((f) => `${dirName(pdfPath)}/${f}`);
        pageCount = files.length;
      } else {
        const bytes = await takeChapterBytes(chapterId, pdfPath);
        pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
        pageCount = pdfDoc.numPages;
      }
      const startPage = Math.min(Math.max(1, initialPage), pageCount);
      currentPage = startPage;
      if (chapterId) void backfillChapterPageCount(chapterId, pageCount);
      loading = false;
      await tick();
      if (mode === 'continuous') {
        if (startPage > 1) {
          const el = rootEl?.querySelector(`.page-wrap[data-idx="${startPage - 1}"]`) as HTMLElement | null;
          el?.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        setupObserver();
      }
    } catch (e) {
      error = String(e);
      loading = false;
    }
    window.addEventListener('keydown', onKeyDownWindow);
    window.addEventListener('mousemove', onMouseMoveWindow);
    window.addEventListener('wheel', onWheelZoomWrapped, { passive: false });
    window.addEventListener('mousedown', onPanDownWrapped);
    window.addEventListener('mousemove', onPanMoveWrapped);
    window.addEventListener('mouseup', onPanUpWrapped);
    window.addEventListener('blur', flushWrapped);
    window.addEventListener('beforeunload', flushWrapped);
    immersive.scheduleHide();
    readingTimer = startReadingTimer(chapterId, app.readerChapter?.pid ?? null);
    await refreshBookmarks();
    registerReaderFlush(progress.flushProgress);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', onKeyDownWindow);
    window.removeEventListener('mousemove', onMouseMoveWindow);
    window.removeEventListener('wheel', onWheelZoomWrapped);
    window.removeEventListener('mousedown', onPanDownWrapped);
    window.removeEventListener('mousemove', onPanMoveWrapped);
    window.removeEventListener('mouseup', onPanUpWrapped);
    window.removeEventListener('blur', flushWrapped);
    window.removeEventListener('beforeunload', flushWrapped);
    immersive.cleanup();
    observer?.disconnect();
    lazyObserver?.disconnect();
    for (const node of canvasNodes.values()) clearCanvas(node);
    canvasNodes.clear();
    renderedSet = new Set();
    scrollContainer?.removeEventListener('scroll', onScroll);
    pdfDoc?.destroy();
    progress.destroyFlush();
    registerReaderFlush(null);
    readingTimer?.stop();
    readingTimer = null;
  });

  let visibleIndices = $derived.by(() => {
    if (mode === 'continuous') return Array.from({ length: pageCount }, (_, i) => i);
    const start = currentPage - 1;
    if (shouldPairAt(start)) return [start, start + 1];
    return [start];
  });
  const effectiveSpread = $derived(mode === 'paged' && visibleIndices.length === 2);

  const modeLabel = $derived(
    toolbarView === 'continuous' ? t('reader.mode.continuous')
      : toolbarView === 'spread' ? t('reader.mode.spread')
      : t('reader.mode.paged'),
  );
  const modeIcon = $derived(
    toolbarView === 'continuous' ? 'scroll'
      : toolbarView === 'spread' ? 'book_open'
      : 'file_text',
  );

  function onToolbarPrev() {
    if (mode === 'continuous') scrollToPage(currentPage - 1);
    else pagedPrev();
  }
  function onToolbarNext() {
    if (mode === 'continuous') scrollToPage(currentPage + 1);
    else pagedNext();
  }
</script>

<div
  class="reader-root"
  class:bg-light={bg === 'light'}
  class:bg-dark={bg === 'dark'}
  class:controls-hidden={!immersive.controlsVisible}
>
  {#if error}
    <div class="err">{error}</div>
  {:else if loading}
    <div class="loading">
      <div class="loading-page">
        <Shimmer radius={12} width="100%" height="100%" />
      </div>
    </div>
  {:else}
    <ReaderToolbar
      {mode}
      {modeLabel}
      {modeIcon}
      {fitLabel}
      {fitIcon}
      {currentPage}
      {pageCount}
      visibleIndicesLen={visibleIndices.length}
      {jumpValue}
      zoom={zoomCtl.zoom}
      onPrev={onToolbarPrev}
      onNext={onToolbarNext}
      onSubmitJump={submitJump}
      onJumpInput={(v) => (jumpValue = v)}
      onCycleMode={cycleMode}
      onCycleFit={cycleFit}
      onZoomIn={() => zoomCtl.zoomIn()}
      onZoomOut={() => zoomCtl.zoomOut()}
      onZoomReset={() => zoomCtl.zoomReset()}
    >
      <BookmarksMenu
        {bookmarks}
        {currentPage}
        {currentBookmarked}
        onToggleHere={toggleBookmarkHere}
        onJump={(p) => scrollToPage(p)}
        onDelete={(id) => deleteBookmark(id)}
      />
      <ReaderSettingsMenu
        {mode}
        {bg}
        {anim}
        {rtl}
        {dpage}
        immersiveOn={immersive.immersiveOn}
        onSetMode={(m) => (mode = m)}
        onSetLayout={setLayout}
        onToggleBg={toggleBg}
        onToggleAnim={toggleAnim}
        onToggleRtl={toggleRtl}
        onCycleDpage={cycleDpage}
        onToggleImmersive={() => immersive.toggleImmersive()}
      />
    </ReaderToolbar>

    <div
      class="pages"
      class:paged={mode !== 'continuous'}
      class:spread={effectiveSpread}
      class:single={effectiveSpread && visibleIndices.length === 1}
      class:anim
      class:swap={modeSwap}
      class:dir-next={pageDir === 1}
      class:dir-prev={pageDir === -1}
      class:rtl
      class:fit-width={fit === 'width'}
      class:fit-height={fit === 'height'}
      class:fit-natural={fit === 'natural'}
      class:pannable={zoomCtl.zoom > 1}
      class:panning={zoomCtl.panning}
      style:zoom={zoomCtl.zoom}
      bind:this={rootEl}
    >
      {#each visibleIndices as i (i)}
        <div class="page-wrap" data-idx={i} class:bookmarked={bookmarkedPages.has(i + 1)}>
          {#if isImageDir}
            <img alt="page {i + 1}" use:attachImage={i} />
          {:else}
            <canvas use:attachCanvas={i} width="0" height="0"></canvas>
          {/if}
          <div class="page-no">{i + 1} / {pageCount}</div>
          {#if bookmarkedPages.has(i + 1)}
            <div class="bm-ribbon" use:tooltip={"Bookmarked"}><Icon name="bookmark" size={14} /></div>
          {/if}
        </div>
      {/each}
    </div>

    {#if mode === 'continuous' || currentPage >= pageCount}
      <div class="ch-footer">
        <button
          class="ch-nav-btn"
          onclick={() => readerPrev()}
          disabled={!readerHasPrev()}
        >
          <Icon name="chevron_left" size={14} />
          {t('reader.prev_chapter')}
        </button>
        <button
          class="ch-nav-btn primary"
          onclick={() => readerNext()}
          disabled={!readerHasNext()}
        >
          {t('reader.next_chapter')}
          <Icon name="chevron_right" size={14} />
        </button>
      </div>
    {/if}

    {#if mode !== 'continuous'}
      <ReaderTapZones
        {currentPage}
        {pageCount}
        {rtl}
        tapCursor={tapZones.tapCursor}
        cursorX={tapZones.cursorX}
        cursorY={tapZones.cursorY}
        cursorPressed={tapZones.cursorPressed}
        cursorDisabled={tapZones.cursorDisabled}
        onPagedNext={pagedNext}
        onPagedPrev={pagedPrev}
        onTapEnter={(s, e) => tapZones.tapEnter(s, e)}
        onTapMove={(e) => tapZones.tapMove(e)}
        onTapLeave={() => tapZones.tapLeave()}
        onTapDown={() => tapZones.tapDown()}
        onTapUp={() => tapZones.tapUp()}
        onTapWheel={(e) => tapZones.tapWheel(e)}
      />
    {/if}
  {/if}
</div>

<style>
  .reader-root {
    position: relative;
    display: flex; flex-direction: column; min-height: 100%;
    transition: background-color 0.2s var(--ease-out);
  }
  .reader-root.bg-dark { background: #161826; }
  .reader-root.bg-light { background: #f3f1ea; }

  .pages {
    display: flex; flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px 16px 48px 16px;
    flex: 1;
  }
  .pages.paged {
    justify-content: center;
    min-height: calc(100vh - 50px);
  }
  .pages.spread {
    flex-direction: row;
    gap: 4px;
    align-items: flex-start;
  }
  .pages.rtl.spread { flex-direction: row-reverse; }
  /* Last page of an odd-count chapter sits alone — center it instead of left-anchoring. */
  .pages.spread.single { justify-content: center; }
  .ch-footer {
    width: 100%; max-width: 1100px;
    margin: 32px auto 16px;
    padding: 0 16px;
    display: flex; justify-content: space-between; gap: 12px;
    position: relative; z-index: 5; /* sit above tap zones (z:3) so buttons stay clickable */
  }
  .ch-nav-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 18px; border-radius: 10px;
    font-size: 12px; font-weight: 600;
    background: rgba(255,255,255,0.06); color: var(--text2);
    border: 1px solid var(--border);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .ch-nav-btn:hover:not(:disabled) {
    background: var(--accent-dim); color: var(--text); border-color: var(--accent);
  }
  .ch-nav-btn.primary {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }
  .ch-nav-btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
  .ch-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .reader-root.bg-light .ch-nav-btn {
    background: rgba(0,0,0,0.04); color: #4b5263; border-color: rgba(0,0,0,0.12);
  }
  .reader-root.bg-light .ch-nav-btn:hover:not(:disabled) {
    background: rgba(124,58,237,0.14); color: #1f2233;
  }
  .pages.anim.paged.dir-next .page-wrap {
    animation: page-slide-next 240ms var(--ease-out);
  }
  .pages.anim.paged.dir-prev .page-wrap {
    animation: page-slide-prev 240ms var(--ease-out);
  }
  .pages { transition: opacity 0.18s var(--ease-out); overflow-x: hidden; }
  .pages.swap { opacity: 0; }
  .pages.pannable { cursor: grab; }
  .pages.pannable.panning { cursor: grabbing; user-select: none; }
  @keyframes page-slide-next {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes page-slide-prev {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .page-wrap {
    position: relative;
    max-width: 100%;
    box-shadow: 0 16px 40px -20px rgba(0,0,0,0.6);
    border-radius: 8px; overflow: hidden;
    background: #161826;
    scroll-margin-top: 60px;
  }
  canvas, img {
    display: block;
    width: 100%; height: auto;
    max-width: 800px;
  }
  .pages.spread :global(canvas), .pages.spread :global(img) {
    max-width: 560px;
  }
  .pages.fit-width :global(canvas), .pages.fit-width :global(img) {
    width: 100%; height: auto;
    max-width: 1100px;
  }
  .pages.fit-height :global(canvas), .pages.fit-height :global(img) {
    max-height: calc(100vh - 110px);
    width: auto; max-width: none;
  }
  .pages.fit-natural :global(canvas), .pages.fit-natural :global(img) {
    width: auto; height: auto;
    max-width: none;
  }
  .pages.spread.fit-width :global(canvas), .pages.spread.fit-width :global(img) {
    max-width: 560px;
  }
  .pages.spread.fit-height :global(canvas), .pages.spread.fit-height :global(img) {
    max-height: calc(100vh - 110px);
  }
  .page-no {
    position: absolute; bottom: 6px; right: 8px;
    font-size: 10px; color: rgba(255,255,255,0.7);
    background: rgba(0,0,0,0.5);
    padding: 2px 6px; border-radius: 4px;
    backdrop-filter: blur(4px);
  }
  .bm-ribbon {
    position: absolute; top: -2px; right: 12px;
    color: #fbbf24;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    pointer-events: none;
  }
  .page-wrap.bookmarked { box-shadow: 0 0 0 2px rgba(251,191,36,0.6), 0 16px 40px -20px rgba(0,0,0,0.6); }
  .loading {
    display: grid; place-items: center;
    padding: 20px 16px;
  }
  .loading-page {
    width: 100%;
    max-width: 720px;
    aspect-ratio: 3 / 4;
    border-radius: 12px;
    overflow: hidden;
  }
  .err {
    padding: 60px 20px; text-align: center;
    color: var(--danger); font-size: 13px;
  }
</style>
