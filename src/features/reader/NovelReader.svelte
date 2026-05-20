<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import NovelSettingsMenu from './NovelSettingsMenu.svelte';
  import { setChapterProgress } from '../../shared/lib/api';
  import { takeChapterBytes, prefetchChapterBytes, hasPrefetched } from '../../shared/lib/prefetch';
  import { startReadingTimer, type ReadingTimer } from '../../shared/lib/reading-time';
  import { onMount, onDestroy, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app, readerHasNext, readerHasPrev, readerNext, readerPrev, peekNextDownloadedChapter } from '../../shared/lib/store.svelte';

  type Props = { pdfPath: string; chapterId?: string };
  let { pdfPath, chapterId }: Props = $props();

  let html = $state<string>('');
  let loading = $state(true);
  let error = $state<string | null>(null);

  // `bg` is derived from the active theme. Light + sepia look light to chrome
  // (e.g. brightness popover dressing), dark + black look dark.
  const bg = $derived<'light' | 'dark'>(
    app.novelTheme === 'light' || app.novelTheme === 'sepia' ? 'light' : 'dark',
  );
  $effect(() => {
    document.documentElement.dataset.readerBg = bg;
    return () => { delete document.documentElement.dataset.readerBg; };
  });

  // Strip doctype/title + interactive widgets legacy publishers embed
  // (e.g. comment delete buttons).
  function extractBody(raw: string): string {
    let s = raw.replace(/^[\s\S]*?<\/title>\s*/i, '');
    s = s.replace(/<button\b[\s\S]*?<\/button>/gi, '');
    s = s.replace(/<form\b[\s\S]*?<\/form>/gi, '');
    s = s.replace(/<input\b[^>]*>/gi, '');
    s = s.replace(/<textarea\b[\s\S]*?<\/textarea>/gi, '');
    s = s.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
    return s.includes('<') ? s : raw;
  }

  // Captured by `attachScroll`; chapter-switch rewinds it to top.
  let scrollContainer: HTMLElement | null = null;

  // Bumped after new HTML lands so {#key} fly-in fires post-swap, not on click.
  let articleEpoch = $state(0);

  $effect(() => {
    const path = pdfPath;
    const cid = chapterId;
    if (!path) return;
    loading = true;
    error = null;
    // Reset scroll BEFORE new HTML lands — otherwise old scrollTop briefly
    // applies and the new chapter looks like it opened scrolled-down.
    if (scrollContainer) scrollContainer.scrollTop = 0;
    takeChapterBytes(cid, path)
      .then((bytes) => {
        html = extractBody(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
        articleEpoch += 1;
        // Novels have no pages — progress=1 just stamps read_at for History/Continue.
        if (cid) void setChapterProgress(cid, 1).catch(() => {});
      })
      .catch((e) => { error = String(e); })
      .finally(() => { loading = false; });
  });

  // Prefetch next chapter at >=70% scroll.
  function onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (!el) return;
    const ratio = (el.scrollTop + el.clientHeight) / Math.max(1, el.scrollHeight);
    if (ratio >= 0.7 && readerHasNext()) {
      const next = peekNextDownloadedChapter();
      if (next && !hasPrefetched(next.chapterId)) {
        prefetchChapterBytes(next.chapterId, next.pdfPath);
      }
    }
  }
  let readingTimer: ReadingTimer | null = null;
  let bodyEl: HTMLElement | null = $state(null);

  // ── TOC outline ─────────────────────────────────────────────────────
  type TocItem = { text: string; level: number; anchorId: string };
  let toc = $state<TocItem[]>([]);
  let tocOpen = $state<boolean>(((): boolean => {
    try { return localStorage.getItem('aan.reader.toc_open') === '1'; } catch { return false; }
  })());
  function setTocOpen(on: boolean) {
    tocOpen = on;
    try { localStorage.setItem('aan.reader.toc_open', on ? '1' : '0'); } catch {}
  }
  function rebuildToc() {
    if (!bodyEl) { toc = []; return; }
    const heads = bodyEl.querySelectorAll('h1, h2, h3');
    const items: TocItem[] = [];
    heads.forEach((h, i) => {
      if (!h.id) h.id = `nv-toc-${i}`;
      const text = (h.textContent || '').trim();
      if (!text) return;
      const level = h.tagName === 'H1' ? 1 : h.tagName === 'H2' ? 2 : 3;
      items.push({ text, level, anchorId: h.id });
    });
    toc = items;
  }
  function jumpToHeading(id: string) {
    const el = bodyEl?.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $effect(() => {
    html; // depend on html for chapter switch
    queueMicrotask(() => rebuildToc()); // wait for @html to commit
  });

  // Portal action — used for find bar + TOC panel.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  // ── Paged layout (CSS multi-columns) ───────────────────────────────
  // In paged mode the article uses `column-width` to flow content into
  // page-sized columns, then we translateX between them. `pageCount` and
  // `pageIdx` reset when html / layout / typography changes.
  let articleW = $state(0);
  let pageCount = $state(1);
  let pageIdx = $state(0);
  function recomputePages() {
    if (!bodyEl) { pageCount = 1; pageIdx = 0; return; }
    const w = bodyEl.clientWidth;
    articleW = w;
    if (app.novelLayout !== 'paged' || w <= 0) {
      pageCount = 1;
      pageIdx = 0;
      return;
    }
    // scrollWidth in column mode == total flow width, even though only
    // one page is visible. Round up because trailing fractional columns
    // are still a navigable page.
    const sw = bodyEl.scrollWidth;
    pageCount = Math.max(1, Math.ceil(sw / w));
    pageIdx = Math.min(pageIdx, pageCount - 1);
  }
  $effect(() => {
    // re-measure on the things that affect layout
    html;
    app.novelLayout;
    app.novelMaxWidth;
    app.novelLineHeight;
    app.fontNovelSize;
    queueMicrotask(async () => { await tick(); recomputePages(); });
  });
  function nextPage() {
    if (app.novelLayout !== 'paged') return false;
    if (pageIdx < pageCount - 1) { pageIdx += 1; return true; }
    return false;
  }
  function prevPage() {
    if (app.novelLayout !== 'paged') return false;
    if (pageIdx > 0) { pageIdx -= 1; return true; }
    return false;
  }

  // ── In-chapter search (Ctrl+F) ──────────────────────────────────────
  let findOpen = $state(false);
  let findQuery = $state('');
  let findCase = $state(false);
  let findMatches = $state(0);
  let findIndex = $state(0); // 1-indexed
  let findInputEl: HTMLInputElement | null = $state(null);

  function clearHighlights() {
    if (!bodyEl) return;
    const marks = bodyEl.querySelectorAll('mark.nv-find');
    marks.forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  function applyHighlights(q: string) {
    clearHighlights();
    findMatches = 0;
    findIndex = 0;
    if (!bodyEl || !q) return;
    const flags = findCase ? 'g' : 'gi';
    let re: RegExp;
    try {
      re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    } catch { return; }
    const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const texts: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) texts.push(n as Text);

    let count = 0;
    for (const t of texts) {
      const txt = t.nodeValue || '';
      re.lastIndex = 0;
      const hits: { start: number; end: number }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(txt))) {
        if (m.index === re.lastIndex) re.lastIndex++;
        hits.push({ start: m.index, end: m.index + m[0].length });
      }
      if (hits.length === 0) continue;
      const frag = document.createDocumentFragment();
      let prev = 0;
      for (const h of hits) {
        if (h.start > prev) frag.appendChild(document.createTextNode(txt.slice(prev, h.start)));
        const mk = document.createElement('mark');
        mk.className = 'nv-find';
        mk.textContent = txt.slice(h.start, h.end);
        frag.appendChild(mk);
        prev = h.end;
        count++;
      }
      if (prev < txt.length) frag.appendChild(document.createTextNode(txt.slice(prev)));
      t.parentNode?.replaceChild(frag, t);
    }
    findMatches = count;
    if (count > 0) {
      findIndex = 1;
      focusMatch();
    }
  }

  function focusMatch() {
    if (!bodyEl) return;
    const marks = bodyEl.querySelectorAll('mark.nv-find');
    marks.forEach((m) => m.classList.remove('active'));
    const i = findIndex - 1;
    const el = marks[i] as HTMLElement | undefined;
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function findNext() {
    if (findMatches === 0) return;
    findIndex = findIndex >= findMatches ? 1 : findIndex + 1;
    focusMatch();
  }
  function findPrev() {
    if (findMatches === 0) return;
    findIndex = findIndex <= 1 ? findMatches : findIndex - 1;
    focusMatch();
  }
  function closeFind() {
    findOpen = false;
    clearHighlights();
    findMatches = 0;
    findIndex = 0;
  }
  function openFind() {
    findOpen = true;
    setTimeout(() => findInputEl?.focus(), 0);
  }

  $effect(() => {
    if (!findOpen) return;
    applyHighlights(findQuery);
  });
  $effect(() => {
    findCase; // re-apply on case toggle
    if (findOpen) applyHighlights(findQuery);
  });

  function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      openFind();
      return;
    }
    if (findOpen && e.key === 'Escape') {
      e.preventDefault();
      closeFind();
      return;
    }
    // Paged mode: arrows flip pages within the chapter; at the edges
    // they fall through to chapter nav.
    if (app.novelLayout === 'paged' && !findOpen) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (nextPage()) { e.preventDefault(); return; }
        if (readerHasNext()) { e.preventDefault(); readerNext(); return; }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (prevPage()) { e.preventDefault(); return; }
        if (readerHasPrev()) { e.preventDefault(); readerPrev(); return; }
      }
    }
  }
  function onFindInputKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) findPrev(); else findNext();
    } else if (e.key === 'ArrowDown') { e.preventDefault(); findNext(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); findPrev(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  }

  let ro: ResizeObserver | null = null;
  onMount(() => {
    readingTimer = startReadingTimer(chapterId, app.readerChapter?.pid ?? null);
    window.addEventListener('keydown', onKeyDown);
    ro = new ResizeObserver(() => recomputePages());
    if (bodyEl) ro.observe(bodyEl);
  });
  onDestroy(() => {
    readingTimer?.stop();
    readingTimer = null;
    window.removeEventListener('keydown', onKeyDown);
    ro?.disconnect();
    ro = null;
  });

  function attachScroll(node: HTMLElement) {
    let n: HTMLElement | null = node.parentElement;
    while (n && n !== document.body) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === 'auto' || oy === 'scroll') break;
      n = n.parentElement;
    }
    if (n) {
      n.addEventListener('scroll', onScroll, { passive: true });
      scrollContainer = n;
      n.scrollTop = 0; // first chapter mount
    }
    return {
      destroy() {
        if (n) n.removeEventListener('scroll', onScroll);
        scrollContainer = null;
      },
    };
  }
</script>

<div
  class="novel-root"
  class:bg-light={bg === 'light'}
  class:bg-dark={bg === 'dark'}
  class:theme-light={app.novelTheme === 'light'}
  class:theme-sepia={app.novelTheme === 'sepia'}
  class:theme-dark={app.novelTheme === 'dark'}
  class:theme-black={app.novelTheme === 'black'}
  class:layout-paged={app.novelLayout === 'paged'}
  style:--novel-max-w="{app.novelMaxWidth}px"
  style:--novel-lh="{app.novelLineHeight}"
  use:attachScroll
>
{#if error}
  <div class="err">{error}</div>
{:else if loading}
  <div class="loading"><Shimmer radius={8} width="600px" height="400px" /></div>
{:else}
  <div class="toolbar">
    <div class="ch-nav">
      <button
        class="ch-btn"
        onclick={() => readerPrev()}
        disabled={!readerHasPrev()}
        use:tooltip={"Previous chapter"}
      >
        <Icon name="chevron_left" size={12} />
        Prev
      </button>
      <button
        class="ch-btn"
        onclick={() => readerNext()}
        disabled={!readerHasNext()}
        use:tooltip={"Next chapter"}
      >
        Next
        <Icon name="chevron_right" size={12} />
      </button>
    </div>
    <div class="right-ctrls">
      {#if app.novelLayout === 'paged' && pageCount > 1}
        <span class="page-ind" aria-label="page indicator">{pageIdx + 1} / {pageCount}</span>
      {/if}
      {#if toc.length > 0}
        <button
          class="bg-toggle"
          class:on={tocOpen}
          onclick={() => setTocOpen(!tocOpen)}
          use:tooltip={"Outline"}
          aria-label="Outline"
        >
          ≡
        </button>
      {/if}
      <button class="bg-toggle" onclick={openFind} use:tooltip={"Search (Ctrl+F)"} aria-label="Search">
        <Icon name="search" size={12} />
      </button>
      <NovelSettingsMenu />
    </div>
  </div>
  {#if findOpen}
    <div class="find-bar" role="search" use:portal>
      <input
        type="text"
        bind:value={findQuery}
        bind:this={findInputEl}
        onkeydown={onFindInputKey}
        placeholder="Find in chapter…"
      />
      <span class="find-count">{findMatches === 0 ? '0/0' : `${findIndex}/${findMatches}`}</span>
      <button class="find-btn" onclick={() => (findCase = !findCase)} class:on={findCase} use:tooltip={"Match case"}>Aa</button>
      <button class="find-btn" onclick={findPrev} aria-label="Previous match" use:tooltip={"Previous (Shift+Enter)"}>
        <Icon name="chevron_left" size={12} />
      </button>
      <button class="find-btn" onclick={findNext} aria-label="Next match" use:tooltip={"Next (Enter)"}>
        <Icon name="chevron_right" size={12} />
      </button>
      <button class="find-btn" onclick={closeFind} aria-label="Close" use:tooltip={"Close (Esc)"}>×</button>
    </div>
  {/if}
  <!-- Key on articleEpoch (not chapterId) so the fly transition fires
       AFTER the new HTML lands, not at click-time. -->
  {#key articleEpoch}
    <article
      class="body"
      style:font-size="{app.fontNovelSize}px"
      style:line-height={app.novelLineHeight}
      style:--page-idx={pageIdx}
      bind:this={bodyEl}
      in:fly={{ y: 18, duration: 320, easing: cubicOut }}
    >{@html html}</article>
  {/key}
  {#if tocOpen && toc.length > 0}
    <aside class="toc-panel" aria-label="Outline" use:portal>
      <div class="toc-head">
        <span>Outline</span>
        <button class="find-btn" onclick={() => setTocOpen(false)} aria-label="Close outline">×</button>
      </div>
      <ul class="toc-list">
        {#each toc as item (item.anchorId)}
          <li class="toc-item lvl-{item.level}">
            <button onclick={() => jumpToHeading(item.anchorId)}>{item.text}</button>
          </li>
        {/each}
      </ul>
    </aside>
  {/if}
  {#if app.novelLayout !== 'paged'}
  <footer class="bottom-nav">
    <button
      class="ch-btn big"
      onclick={() => readerPrev()}
      disabled={!readerHasPrev()}
    >
      <Icon name="chevron_left" size={14} />
      Prev chapter
    </button>
    <button
      class="ch-btn big"
      onclick={() => readerNext()}
      disabled={!readerHasNext()}
    >
      Next chapter
      <Icon name="chevron_right" size={14} />
    </button>
  </footer>
  {/if}
{/if}
</div>

<style>
  .novel-root {
    min-height: 100%;
    transition: background-color 0.2s var(--ease-out), color 0.2s var(--ease-out);
  }
  /* Four themes — light (paperwhite), sepia, dark (slate), black (OLED). */
  .novel-root.theme-light { background: #f3f1ea; color: #1f2233; }
  .novel-root.theme-sepia { background: #f1e7d0; color: #4b3a23; }
  .novel-root.theme-dark  { background: #161826; color: #e6e2d5; }
  .novel-root.theme-black { background: #000;    color: #c8c4b7; }

  .toolbar {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; padding: 10px 16px;
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-soft);
  }
  .novel-root.theme-dark  .toolbar { background: rgba(8, 14, 26, 0.78); }
  .novel-root.theme-black .toolbar { background: rgba(0, 0, 0, 0.85); border-bottom-color: rgba(255,255,255,0.06); }
  .novel-root.theme-light .toolbar { background: rgba(255,255,255,0.82); border-bottom-color: rgba(0,0,0,0.08); }
  .novel-root.theme-sepia .toolbar { background: rgba(241, 231, 208, 0.85); border-bottom-color: rgba(75,58,35,0.10); }
  .ch-nav { display: inline-flex; gap: 6px; }
  .right-ctrls { display: inline-flex; align-items: center; gap: 10px; }
  .ch-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 5px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 600;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .novel-root.bg-dark .ch-btn { background: rgba(255,255,255,0.04); color: #9ca3af; }
  .novel-root.bg-light .ch-btn { background: rgba(0,0,0,0.05);     color: #4b5263; }
  .novel-root.bg-dark .ch-btn:hover:not(:disabled) { background: var(--accent-dim); color: #f9fafb; }
  .novel-root.bg-light .ch-btn:hover:not(:disabled) { background: rgba(124,58,237,0.14); color: #1f2233; }
  .ch-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .ch-btn.big { padding: 10px 18px; font-size: 12px; border-radius: 10px; }
  .bg-toggle {
    display: inline-flex; align-items: center; gap: 6px;
    height: 26px; padding: 0 10px; border-radius: 6px;
    font-size: 11px; font-weight: 600;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .novel-root.bg-dark  .bg-toggle { background: rgba(255,255,255,0.04); color: #9ca3af; }
  .novel-root.bg-light .bg-toggle { background: rgba(0,0,0,0.05); color: #4b5263; }
  .novel-root.bg-dark  .bg-toggle:hover { background: var(--accent-dim); color: #f9fafb; }
  .novel-root.bg-light .bg-toggle:hover { background: rgba(124,58,237,0.14); color: #1f2233; }
  .bg-toggle.on { background: var(--accent-dim); color: var(--sidebar-hi); }
  /* Portal'd — in-tree backdrop-filter is killed by page-wrap's will-change. */
  .bright-popover {
    position: fixed;
    z-index: 2000;
    padding: 12px 14px;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.55);
    animation: pop-in 0.16s var(--ease-out);
  }
  @keyframes pop-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .font-ctrls { display: inline-flex; align-items: center; gap: 8px; }
  .font-ctrls button {
    width: 32px; height: 28px; border-radius: 6px;
    font-size: 11px; font-weight: 600;
    transition: color 0.15s var(--ease-out);
  }
  .novel-root.bg-dark  .font-ctrls button { background: rgba(255,255,255,0.06); color: #9ca3af; }
  .novel-root.bg-light .font-ctrls button { background: rgba(0,0,0,0.06); color: #4b5263; }
  .novel-root.bg-dark  .font-ctrls button:hover { color: #f9fafb; }
  .novel-root.bg-light .font-ctrls button:hover { color: #1f2233; }
  .size {
    font-size: 11px; font-family: var(--font-mono);
  }
  .novel-root.bg-dark  .size { color: #6b7280; }
  .novel-root.bg-light .size { color: #8b91a3; }
  .body {
    max-width: var(--novel-max-w, 760px);
    margin: 0 auto;
    padding: 40px 16px 24px;
    font-family: var(--font-novel);
    color: inherit;
  }
  /* Paged layout: split flow into column-width pages, then translateX
     between them. Hide overflow on the root so scroll is trapped. */
  .novel-root.layout-paged { height: 100%; overflow: hidden; }
  .novel-root.layout-paged .body {
    column-width: var(--novel-max-w, 760px);
    column-gap: 60px;
    column-fill: auto;
    height: calc(100vh - 56px - 60px);
    padding: 30px 32px 30px;
    max-width: none;
    transform: translateX(calc(var(--page-idx, 0) * -100%));
    transition: transform 0.32s var(--ease-out);
    -webkit-column-break-inside: avoid;
  }
  .novel-root.layout-paged .body :global(img),
  .novel-root.layout-paged .body :global(h1),
  .novel-root.layout-paged .body :global(h2),
  .novel-root.layout-paged .body :global(h3) {
    break-inside: avoid;
  }
  .page-ind {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text2);
    padding: 0 8px;
    opacity: 0.8;
  }
  .body :global(p) { margin-bottom: 1.3em; }
  .body :global(img) {
    max-width: 100%; height: auto;
    border-radius: 8px;
    margin: 1em auto;
    display: block;
  }
  .body :global(h1), .body :global(h2), .body :global(h3) {
    color: inherit;
    font-weight: 700;
    margin: 1.2em 0 0.5em;
    font-family: var(--font-novel);
  }
  .body :global(em) { color: inherit; font-style: italic; }
  .body :global(strong) { color: inherit; }
  .bottom-nav {
    max-width: 760px; margin: 0 auto;
    padding: 24px 16px 60px;
    display: flex; justify-content: space-between; gap: 12px;
    border-top: 1px solid var(--border-soft);
    margin-top: 24px;
  }
  .loading { display: grid; place-items: center; padding: 60px; }
  .err { padding: 60px 20px; text-align: center; color: var(--danger); }

  .find-bar {
    position: fixed; top: 56px; right: 16px; z-index: 2000;
    max-width: calc(100vw - 32px);
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 8px;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 9999px;
    box-shadow: 0 12px 28px -10px rgba(0,0,0,0.55);
    animation: pop-in 0.16s var(--ease-out);
  }
  .find-bar input {
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 4px 10px;
    font-size: 12px; color: var(--text);
    outline: none; min-width: 180px;
  }
  .find-bar input:focus { border-color: var(--accent); }
  .find-count {
    font-family: var(--font-mono); font-size: 10px; color: var(--text2);
    min-width: 48px; text-align: center;
  }
  .find-btn {
    height: 24px; min-width: 24px; padding: 0 8px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 9999px;
    background: rgba(255,255,255,0.05); color: var(--text2);
    font-size: 11px; font-weight: 700;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .find-btn:hover { background: var(--accent-dim); color: var(--text); }
  .find-btn.on { background: var(--accent); color: #fff; }
  .body :global(mark.nv-find) {
    background: rgba(251, 191, 36, 0.45);
    color: inherit; border-radius: 2px;
    padding: 0 1px;
  }
  .toc-panel {
    position: fixed; top: 80px; right: 16px; bottom: 16px;
    width: 280px; max-width: 80vw;
    z-index: 2000;
    display: flex; flex-direction: column;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.55);
    overflow: hidden;
    animation: toc-slide 0.18s var(--ease-out);
  }
  @keyframes toc-slide {
    from { opacity: 0; transform: translateX(8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .toc-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-soft);
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text2);
  }
  .toc-list {
    list-style: none; margin: 0; padding: 6px;
    overflow-y: auto; flex: 1;
  }
  .toc-item button {
    width: 100%; text-align: left;
    padding: 6px 10px; border-radius: 6px;
    background: transparent; color: var(--text2);
    font-size: 12px; line-height: 1.4;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .toc-item button:hover { background: var(--accent-dim); color: var(--text); }
  .toc-item.lvl-2 button { padding-left: 22px; font-size: 11px; }
  .toc-item.lvl-3 button { padding-left: 34px; font-size: 11px; color: var(--text3); }
  @media (max-width: 900px) {
    .toc-panel { left: 16px; right: 16px; width: auto; }
  }
  .body :global(mark.nv-find.active) {
    background: rgba(251, 191, 36, 0.95);
    box-shadow: 0 0 0 2px rgba(251,191,36,0.45);
  }
</style>
