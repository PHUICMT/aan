<script lang="ts">
  import { onMount } from 'svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import CoverCard from './CoverCard.svelte';
  import CoverRow from './CoverRow.svelte';
  import VirtualGrid from './VirtualGrid.svelte';
  import LibraryFilters from './LibraryFilters.svelte';
  import CollectionChips from './CollectionChips.svelte';
  import BulkEditModal from './BulkEditModal.svelte';
  import LibrarySearchResults from './LibrarySearchResults.svelte';
  import LibraryEmptyState from './LibraryEmptyState.svelte';
  import { useLibraryFilters, SORT_KEYS, SORT_LABELS, type SortKey } from './composables/useLibraryFilters.svelte';

  // Below this size the plain CSS grid is faster than the virtualizer.
  const VIRT_THRESHOLD = 200;
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import ImportButton from './ImportButton.svelte';
  import { listLocalSeries, listGenres, searchChapters, listChapters } from '../../shared/lib/api';
  import Icon from '../../shared/components/Icon.svelte';
  import { LIBRARY_FILTERS, ANIM } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import {
    app,
    openReader,
    openSeries,
    setReaderChapters,
  } from '../../shared/lib/store.svelte';
  import type { SeriesCard, GenreCount, ChapterMatch } from '../../shared/lib/types';
  import { portal, anchorBelow } from '../../shared/lib/portal';

  //───── State ─────
  const SKELETON_KEY = 'aan.library.lastCount';
  const GENRE_SKELETON_KEY = 'aan.library.lastGenres';
  const skeletonCount = (() => {
    const n = parseInt(localStorage.getItem(SKELETON_KEY) ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : 0;
  })();

  let series = $state<SeriesCard[]>([]);
  let genres = $state<GenreCount[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let chapterMatches = $state<ChapterMatch[]>([]);
  let chapterSearchPending = $state(false);

  // All filter / view-mode / sort state lives in the composable.
  const filters = useLibraryFilters(() => series);

  // Bulk selection mode — toggle on, multi-select cards, then edit /
  // delete via a modal. Exits automatically after a successful apply.
  let selectMode = $state(false);
  let selectedPids = $state(new Set<number>());
  let bulkEditOpen = $state(false);

  function toggleSelectMode() {
    selectMode = !selectMode;
    if (!selectMode) selectedPids = new Set();
  }
  function toggleSelected(pid: number) {
    const next = new Set(selectedPids);
    if (next.has(pid)) next.delete(pid); else next.add(pid);
    selectedPids = next;
  }
  function selectAllVisible() {
    selectedPids = new Set(filters.filtered.map((s) => s.pid));
  }
  function clearSelected() {
    selectedPids = new Set();
  }
  async function reloadAfterBulk() {
    bulkEditOpen = false;
    selectMode = false;
    selectedPids = new Set();
    try { series = await listLocalSeries(); } catch {}
  }

  //───── Effects ─────
  // Debounced chapter-title search (220ms).
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const q = filters.query.trim();
    if (searchTimer) clearTimeout(searchTimer);
    if (q.length < 2) {
      chapterMatches = [];
      chapterSearchPending = false;
      return;
    }
    chapterSearchPending = true;
    searchTimer = setTimeout(async () => {
      try {
        chapterMatches = await searchChapters(q, 40);
      } catch {
        chapterMatches = [];
      } finally {
        chapterSearchPending = false;
      }
    }, 220);
  });

  async function openChapterMatch(m: ChapterMatch) {
    try {
      const chs = await listChapters(m.pid);
      setReaderChapters(chs);
      const c = chs.find((x) => x.chapter_id === m.chapter_id);
      if (c && c.is_downloaded === 1) openReader(c);
      else openSeries(m.pid);
    } catch {
      openSeries(m.pid);
    }
  }

  //───── Sort menu (popover) ─────
  let sortOpen = $state(false);
  let sortTriggerEl = $state<HTMLButtonElement | null>(null);
  let sortPos = $state({ top: 0, right: 16 });
  $effect(() => {
    if (!sortOpen || !sortTriggerEl) return;
    sortPos = anchorBelow(sortTriggerEl, { gap: 6 });
  });
  function pickSort(k: SortKey) {
    filters.sortKey = k;
    sortOpen = false;
  }
  function onDocKey(e: KeyboardEvent) {
    if (e.key === 'Escape') sortOpen = false;
  }
  function closeSortOnOutside(node: HTMLElement, onOutside: () => void) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (sortTriggerEl && sortTriggerEl.contains(target)) return;
      onOutside();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }

  // Re-fetch on series mutation tick (status/favorite/refresh).
  let lastSeenTick = -1;
  $effect(() => {
    const t = app.seriesMutationTick;
    if (t > 0 && t !== lastSeenTick) {
      lastSeenTick = t;
      void listLocalSeries().then((s) => { series = s; }).catch(() => {});
    }
  });

  onMount(async () => {
    try {
      const [s, g] = await Promise.all([listLocalSeries(), listGenres()]);
      series = s;
      genres = g;
      try {
        localStorage.setItem(SKELETON_KEY, String(s.length));
        localStorage.setItem(GENRE_SKELETON_KEY, String(g.length));
      } catch {}
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  const emptyState = $derived(
    error ? 'error' :
    loading ? 'loading' :
    filters.filtered.length === 0 ? 'empty' : null
  );
</script>

<svelte:window onkeydown={onDocKey} />

<div class="page" data-test="library">
  <header class="hero">
    <div class="hero-title">
      <div class="title-row">
        <h1>{t('library.title')}</h1>
        <div class="counter" data-test="library-counter">
          {#if loading}
            <span class="count-skel"><Shimmer radius={4} height="100%" /></span>
          {:else}
            <span class="count">{series.length}</span>
          {/if}
          <span class="count-label">{t('library.series')}</span>
        </div>
      </div>
      <p class="sub">{t('library.sub')}</p>
    </div>
    <div class="hero-actions">
      <ImportButton />
      <button
        type="button"
        class="select-btn"
        class:on={selectMode}
        onclick={toggleSelectMode}
        use:tooltip={t('library.select_tooltip')}
        data-test="library-select-toggle"
      >
        <Icon name={selectMode ? 'x' : 'check'} size={12} />
        {selectMode ? t('library.select_exit') : t('library.select')}
      </button>
    </div>
  </header>

  <div class="toolbar">
    <div class="filters">
      {#each LIBRARY_FILTERS as f (f.id)}
        {@const count = filters.countFor(f.id)}
        <button
          class="filter"
          class:active={filters.typeFilter === f.id}
          onclick={() => (filters.typeFilter = f.id)}
          data-test={`filter-type-${f.id}`}
        >
          {t(f.labelKey)}
          {#if loading}
            <span class="filter-count-skel"><Shimmer radius={9999} height="100%" /></span>
          {:else}
            <span class="filter-count" class:zero={count === 0}>{count}</span>
          {/if}
        </button>
      {/each}
    </div>
    <input bind:value={filters.query} placeholder={t('library.search')} class="search" data-test="library-search" />
    <div class="sort-wrap">
      <button
        bind:this={sortTriggerEl}
        class="sort"
        class:open={sortOpen}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={sortOpen}
        use:tooltip={t('library.sort')}
        onclick={() => (sortOpen = !sortOpen)}
        data-test="library-sort-trigger"
      >
        <span class="sort-label">{t(SORT_LABELS[filters.sortKey])}</span>
        <span class="sort-caret" class:flip={sortOpen}>
          <Icon name="chevron_down" size={12} />
        </span>
      </button>
      {#if sortOpen}
        <ul
          class="sort-menu"
          role="listbox"
          style:top="{sortPos.top}px"
          style:right="{sortPos.right}px"
          use:portal
          use:closeSortOnOutside={() => (sortOpen = false)}
          data-test="library-sort-menu"
        >
          {#each SORT_KEYS as k (k)}
            <li>
              <button
                class="sort-item"
                class:active={filters.sortKey === k}
                role="option"
                aria-selected={filters.sortKey === k}
                onclick={() => pickSort(k)}
                data-test={`sort-item-${k}`}
              >
                <span>{t(SORT_LABELS[k])}</span>
                {#if filters.sortKey === k}
                  <span class="sort-check"><Icon name="check" size={11} /></span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  {#if loading && genres.length === 0}
    <LibraryFilters {filters} genres={[]} {loading} skeletonOnly />
  {:else if genres.length > 0}
    <LibraryFilters {filters} {genres} {loading} />
  {/if}

  <CollectionChips {filters} />

  {#if chapterMatches.length > 0 || (chapterSearchPending && filters.query.trim().length >= 2)}
    <LibrarySearchResults
      matches={chapterMatches}
      pending={chapterSearchPending}
      onOpen={openChapterMatch}
    />
  {/if}

  {#if emptyState}
    <LibraryEmptyState
      state={emptyState}
      {error}
      {skeletonCount}
      viewMode={filters.viewMode}
    />
  {:else if filters.viewMode === 'list'}
    {#if filters.filtered.length > VIRT_THRESHOLD}
      <VirtualGrid
        items={filters.filtered}
        cardMinWidth={9999}
        cardAspect={0}
        extraHeight={92}
        gap={8}
        key={(s) => s.pid}
      >
        {#snippet item(s)}
          <CoverRow series={s} delay={0} />
        {/snippet}
      </VirtualGrid>
    {:else}
      <div class="list-view">
        {#each filters.filtered as s, i (s.pid)}
          <CoverRow series={s} delay={Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)} />
        {/each}
      </div>
    {/if}
  {:else if filters.filtered.length > VIRT_THRESHOLD}
    {@const isCompact = filters.viewMode === 'compact'}
    <VirtualGrid
      items={filters.filtered}
      cardMinWidth={isCompact ? 120 : 160}
      cardAspect={220 / 160}
      extraHeight={isCompact ? 48 : 56}
      gap={isCompact ? 12 : 18}
      key={(s) => s.pid}
    >
      {#snippet item(s)}
        <CoverCard series={s} delay={0} selectMode={selectMode} selected={selectedPids.has(s.pid)} onToggleSelect={toggleSelected} />
      {/snippet}
    </VirtualGrid>
  {:else}
    <div class="grid mode-{filters.viewMode}">
      {#each filters.filtered as s, i (s.pid)}
        <CoverCard
          series={s}
          delay={Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)}
          selectMode={selectMode}
          selected={selectedPids.has(s.pid)}
          onToggleSelect={toggleSelected}
        />
      {/each}
    </div>
  {/if}

  {#if selectMode}
    <div class="bulk-bar" role="toolbar" aria-label="Bulk actions" data-test="bulk-bar">
      <span class="bulk-count">
        <strong data-test="bulk-count">{selectedPids.size}</strong>
        {t('series.sel.count')}
      </span>
      <button type="button" class="bulk-link" onclick={selectAllVisible} disabled={selectedPids.size === filters.filtered.length}>
        {t('library.select_all_visible')}
      </button>
      <button type="button" class="bulk-link" onclick={clearSelected} disabled={selectedPids.size === 0}>
        {t('series.sel.clear')}
      </button>
      <div class="bulk-spacer"></div>
      <button
        type="button"
        class="bulk-cta"
        disabled={selectedPids.size === 0}
        onclick={() => (bulkEditOpen = true)}
        data-test="bulk-edit-open"
      >
        <Icon name="pencil" size={12} />
        {t('library.bulk.edit')}
      </button>
    </div>
  {/if}
</div>

{#if bulkEditOpen}
  <BulkEditModal
    pids={[...selectedPids]}
    onClose={() => (bulkEditOpen = false)}
    onApplied={reloadAfterBulk}
  />
{/if}

<style>
  .page {
    padding: 28px 40px 40px; height: 100%; overflow-y: auto;
    /* Reserve gutter to prevent jitter when filter panel toggles. */
    scrollbar-gutter: stable;
  }
  .hero {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
    margin-bottom: 22px;
  }
  .hero-title { min-width: 0; }
  .title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .hero h1 {
    font-size: 28px; font-weight: 700; letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
  }
  .sub { font-size: 12px; color: var(--text2); margin: 6px 0 0; }
  .hero-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .counter {
    display: inline-flex; align-items: baseline; gap: 6px;
    padding: 5px 12px;
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.35);
    border-radius: 9999px;
    line-height: 1;
  }
  .count {
    font-size: 18px; font-weight: 700; color: var(--sidebar-hi); line-height: 1;
    display: inline-block; min-width: 22px; text-align: center;
    animation: count-in 0.28s var(--ease-out);
  }
  @keyframes count-in {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  .count-skel {
    display: inline-flex; align-items: center;
    vertical-align: middle;
    width: 22px; height: 18px;
    border-radius: 4px;
    overflow: hidden;
  }
  .count-label { font-size: 11px; color: var(--text2); line-height: 1; }

  .toolbar {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 22px; flex-wrap: wrap;
  }
  .filters { display: flex; gap: 4px; flex-wrap: wrap; }
  .filter {
    padding: 6px 13px; border-radius: 9999px;
    border: 1px solid var(--border);
    background: transparent; color: var(--text2);
    font-size: 12px; font-weight: 500;
    line-height: 1;
    display: inline-flex; align-items: center; gap: 8px;
    transition:
      background 0.18s var(--ease-out),
      border-color 0.18s var(--ease-out),
      color 0.18s var(--ease-out),
      transform 0.15s var(--ease-out);
  }
  .filter:hover { background: var(--surface2); color: var(--text); }
  .filter:active { transform: scale(0.97); }
  .filter.active {
    background: var(--accent); border-color: var(--accent);
    color: #fff; font-weight: 600;
    box-shadow: 0 6px 16px -6px var(--accent-glow);
  }
  .filter-count {
    font-size: 10px; padding: 2px 6px; border-radius: 9999px;
    background: rgba(255,255,255,0.18);
    color: inherit; font-weight: 700;
    line-height: 1;
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 14px; min-width: 18px;
    animation: count-in 0.28s var(--ease-out);
  }
  .filter:not(.active) .filter-count { background: var(--surface2); }
  .filter-count.zero { visibility: hidden; }
  .filter-count-skel {
    display: inline-flex; align-items: center;
    vertical-align: middle;
    width: 18px; height: 12px;
    border-radius: 9999px;
    overflow: hidden;
  }

  .search {
    flex: 1; min-width: 200px;
    padding: 8px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 9999px;
    font-size: 12px; outline: none;
    transition:
      border-color 0.18s var(--ease-out),
      background 0.18s var(--ease-out),
      box-shadow 0.18s var(--ease-out);
  }
  .search:focus {
    border-color: var(--accent);
    background: rgba(255,255,255,0.06);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  .sort-wrap { position: relative; }
  .sort {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 7px 8px 7px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 9999px;
    color: var(--text2);
    font-size: 11px; font-weight: 500;
    outline: none;
    cursor: pointer;
    transition:
      border-color 0.15s var(--ease-out),
      color 0.15s var(--ease-out),
      background 0.15s var(--ease-out);
  }
  .sort:hover, .sort.open { border-color: var(--accent); color: var(--text); background: var(--hover-bg); }
  .sort-label { white-space: nowrap; }
  .sort-caret {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 9999px;
    color: var(--text3);
    transition: transform 0.2s var(--ease-out), color 0.15s var(--ease-out);
  }
  .sort:hover .sort-caret, .sort.open .sort-caret { color: var(--text); }
  .sort-caret.flip { transform: rotate(180deg); }

  .sort-menu {
    position: fixed;
    min-width: 180px;
    margin: 0; padding: 4px;
    list-style: none;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.55), 0 2px 8px -2px rgba(0,0,0,0.4);
    z-index: 2000;
    transform-origin: top right;
    animation: sort-pop 0.18s var(--ease-out);
  }
  @keyframes sort-pop {
    from { opacity: 0; transform: translateY(-4px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .sort-item {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 7px 12px;
    border-radius: 8px;
    background: transparent; color: var(--text2);
    font-size: 11px; font-weight: 500;
    text-align: left;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .sort-item:hover { background: var(--hover-bg); color: var(--text); }
  .sort-item.active { color: var(--sidebar-hi); background: var(--accent-dim); }
  .sort-check { display: inline-flex; color: var(--accent); }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 18px;
    transition: grid-template-columns 0.28s var(--ease-out), gap 0.28s var(--ease-out);
  }
  .grid.mode-compact { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
  .list-view { display: flex; flex-direction: column; gap: 8px; }

  /* Tune View Transitions crossfade: 280ms ease-out vs browser default. */
  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation-duration: 0.28s;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* ── Select mode toolbar pill + floating bulk-action bar ────── */
  .select-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px;
    border-radius: 10px;
    background: rgba(127,127,127,0.08);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 12px; font-weight: 600;
    transition:
      background 0.15s var(--ease-out),
      color 0.15s var(--ease-out),
      border-color 0.15s var(--ease-out),
      transform 0.15s var(--ease-out);
  }
  .select-btn:hover { color: var(--text); border-color: var(--accent); transform: translateY(-1px); }
  .select-btn.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .bulk-bar {
    position: fixed; left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    z-index: 1500;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px 10px 18px;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--menu-bg) 92%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    box-shadow: 0 22px 50px -12px rgba(0,0,0,0.55);
    animation: bulk-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes bulk-in {
    from { opacity: 0; transform: translate(-50%, 14px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }
  .bulk-count { font-size: 12px; color: var(--text2); }
  .bulk-count strong { font-size: 13px; color: var(--text); font-weight: 700; margin-right: 4px; }
  .bulk-link {
    padding: 5px 10px; border-radius: 9999px;
    background: rgba(127,127,127,0.08); color: var(--text2);
    font-size: 11px; font-weight: 600;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .bulk-link:hover:not(:disabled) { background: var(--hover-bg); color: var(--text); }
  .bulk-link:disabled { opacity: 0.4; cursor: not-allowed; }
  .bulk-spacer { width: 8px; }
  .bulk-cta {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 9999px;
    background: var(--accent); color: #fff;
    font-size: 12px; font-weight: 700;
    transition: background 0.15s var(--ease-out), transform 0.15s var(--ease-out);
  }
  .bulk-cta:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 86%, white 14%);
    transform: translateY(-1px);
  }
  .bulk-cta:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
