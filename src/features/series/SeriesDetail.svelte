<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { tooltip } from '../../shared/lib/tooltip';
  import BackButton from '../../shared/components/BackButton.svelte';
  import ChapterRow from '../series/ChapterRow.svelte';
  import SeriesEditModal from './SeriesEditModal.svelte';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import {
    getSeries,
    listChapters,
    openInExplorer,
    seriesFolder,
    setSeriesFavorite,
    setReadingStatus,
  } from '../../shared/lib/api';
  import { getCoverUrl } from '../../shared/lib/covers';
  import { TYPE_CHIP, READING_STATUSES } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { app, bumpSeriesMutation, setReaderChapters, openReader, goBack } from '../../shared/lib/store.svelte';
  import type { Chapter, SeriesDetail } from '../../shared/lib/types';
  import { portal, anchorBelow } from '../../shared/lib/portal';

  const PARALLAX_FACTOR = 0.35;
  const FADE_AT = 240; // px scroll where hero alpha bottoms out

  //───── State ─────
  let detail = $state<SeriesDetail | null>(null);
  let chapters = $state<Chapter[]>([]);
  let editorOpen = $state(false);

  async function onEditorSaved() {
    editorOpen = false;
    if (detail) {
      try { detail = await getSeries(detail.pid); }
      catch { /* keep stale data; the bump below will refresh the library */ }
    }
    bumpSeriesMutation();
  }
  function onSeriesDeleted() {
    editorOpen = false;
    bumpSeriesMutation();
    goBack();
  }
  // Two-effect refresh on reader progress tick: capture, then drain
  // once detail is loaded — so ticks fired pre-load aren't dropped.
  let lastProgressTick = $state(app.chapterProgressTick);
  let pendingProgressRefresh = $state(false);
  $effect(() => {
    const tick = app.chapterProgressTick;
    if (tick !== lastProgressTick) {
      lastProgressTick = tick;
      pendingProgressRefresh = true;
    }
  });
  $effect(() => {
    if (!pendingProgressRefresh) return;
    const d = detail;
    if (!d) return;
    pendingProgressRefresh = false;
    void listChapters(d.pid).then((chs) => {
      chapters = chs;
      setReaderChapters(chs);
    }).catch(() => {});
  });
  let coverUrl = $state<string | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  const pid = $derived(app.seriesPid);
  const chip = $derived(detail ? TYPE_CHIP[detail.type] ?? TYPE_CHIP.manga : null);

  // Continue chapter precedence: unfinished-read > most-recently-read >
  // lowest-numbered downloaded.
  const continueChapter = $derived.by(() => {
    if (chapters.length === 0) return null;
    const withRead = chapters
      .filter((c) => c.read_at)
      .sort((a, b) => (b.read_at ?? '').localeCompare(a.read_at ?? ''));
    // page_count==0 = legacy row with unknown count; treat lpr>0 as in-progress.
    const unfinished = withRead.find((c) => {
      const lpr = c.last_page_read ?? 0;
      if (lpr <= 0) return false;
      return c.page_count === 0 || lpr < c.page_count;
    });
    if (unfinished) return unfinished;
    if (withRead[0]) return withRead[0];
    // Sorted DESC by chapter_no — last is lowest.
    const downloaded = chapters.filter((c) => c.is_downloaded === 1);
    if (downloaded.length === 0) return null;
    return downloaded[downloaded.length - 1];
  });

  function onContinue() {
    if (!continueChapter) return;
    openReader(continueChapter);
  }

  onMount(async () => {
    if (pid == null) {
      error = 'No series selected';
      loading = false;
      return;
    }
    try {
      const [d, chs, cov] = await Promise.all([
        getSeries(pid),
        listChapters(pid),
        getCoverUrl(pid),
      ]);
      detail = d;
      chapters = chs;
      setReaderChapters(chs);
      if (cov) coverUrl = cov;
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }

    // Backstop refresh — initial save may not have committed yet (fire-and-forget).
    setTimeout(() => {
      if (detail) {
        void listChapters(detail.pid).then((chs2) => {
          chapters = chs2;
          setReaderChapters(chs2);
        }).catch(() => {});
      }
    }, 500);

  });

  // Don't revoke coverUrl — owned by the shared LRU cache.

  //───── Hero parallax ─────
  let scrollY = $state(0);
  function onScroll(e: Event) {
    scrollY = (e.currentTarget as HTMLElement).scrollTop;
  }
  const heroShift = $derived(-scrollY * PARALLAX_FACTOR);
  const heroAlpha = $derived(Math.max(0.25, 1 - scrollY / FADE_AT));

  let toastMsg = $state<string | null>(null);

  //───── Bulk select ─────
  let selectMode = $state(false);
  let selectedIds = $state<Set<string>>(new Set());
  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }
  function clearSelection() {
    selectedIds = new Set();
  }
  function exitSelectMode() {
    selectMode = false;
    clearSelection();
  }

  async function onOpenFolder() {
    if (!detail) return;
    try {
      const folder = await seriesFolder(detail.pid, detail.type);
      await openInExplorer(folder, false);
    } catch (e) {
      toastMsg = `${e}`;
      setTimeout(() => (toastMsg = null), 3000);
    }
  }

  let statusMenuOpen = $state(false);
  let statusTriggerEl = $state<HTMLButtonElement | null>(null);
  let statusPos = $state({ top: 0, left: 0 });
  $effect(() => {
    if (!statusMenuOpen || !statusTriggerEl) return;
    statusPos = anchorBelow(statusTriggerEl, { gap: 6 });
  });
  function closeStatusOnOutside(node: HTMLElement, onOutside: () => void) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (statusTriggerEl && statusTriggerEl.contains(target)) return;
      onOutside();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }
  const currentStatus = $derived(
    detail?.reading_status ? READING_STATUSES.find((s) => s.id === detail!.reading_status) : null,
  );
  async function pickStatus(id: string | null) {
    if (!detail) return;
    statusMenuOpen = false;
    const prev = detail.reading_status;
    detail = { ...detail, reading_status: id as typeof detail.reading_status };
    try {
      await setReadingStatus(detail.pid, id);
      bumpSeriesMutation();
    } catch (e) {
      detail = { ...detail, reading_status: prev };
      toastMsg = `${e}`;
      setTimeout(() => (toastMsg = null), 3000);
    }
  }
  async function onToggleFavorite() {
    if (!detail) return;
    const next = !detail.is_favorite;
    // Optimistic flip, revert on error.
    detail = { ...detail, is_favorite: next ? 1 : 0 };
    try {
      await setSeriesFavorite(detail.pid, next);
    } catch (e) {
      detail = { ...detail, is_favorite: next ? 0 : 1 };
      toastMsg = `${e}`;
      setTimeout(() => (toastMsg = null), 3000);
    }
  }

</script>


<div class="page" onscroll={onScroll} data-test="series-detail">
  <div class="topbar">
    <BackButton />
  </div>

  {#if error}
    <div class="empty error">{error}</div>
  {:else if loading || !detail}
    <div class="series-hero is-loading">
      <div class="cover-skel"><Shimmer radius={16} /></div>
      <div class="info-skel">
        <div class="skel-line w70"><Shimmer radius={6} height="100%" /></div>
        <div class="skel-line w40"><Shimmer radius={6} height="100%" /></div>
        <div class="skel-line w55"><Shimmer radius={6} height="100%" /></div>
      </div>
    </div>
  {:else}
    <div
      class="series-hero"
      style:transform="translate3d(0, {heroShift}px, 0)"
      style:opacity={heroAlpha}
    >
      <div class="cover">
        {#if coverUrl}
          <img src={coverUrl} alt={detail.name} />
        {:else}
          <div class="cover-fallback">{detail.name.charAt(0)}</div>
        {/if}
      </div>
      <div class="info">
        {#if chip}
          <span class="type-chip" style:background={chip.bg} style:color={chip.fg}>
            {t(chip.labelKey)}
          </span>
        {/if}
        <h1>{detail.name}</h1>
        {#if detail.alias}
          <p class="alias">{detail.alias}</p>
        {/if}

        <div class="meta-grid">
          {#if detail.author_name}
            <div class="meta-row">
              <span class="meta-label">{t('series.author')}</span>
              <span class="meta-value">{detail.author_name}</span>
            </div>
          {/if}
          {#if detail.artist_name}
            <div class="meta-row">
              <span class="meta-label">{t('series.artist')}</span>
              <span class="meta-value">{detail.artist_name}</span>
            </div>
          {/if}
          <div class="meta-row">
            <span class="meta-label">{t('series.chapters')}</span>
            <span class="meta-value">
              {detail.local_chapter_count} / {detail.chapter_count}
            </span>
          </div>
        </div>

        <div class="series-actions">
          <div class="status-wrap">
            <button
              bind:this={statusTriggerEl}
              class="head-btn status-btn"
              class:on={!!currentStatus}
              onclick={() => (statusMenuOpen = !statusMenuOpen)}
              use:tooltip={t('rs.set')}
              data-test="series-status"
            >
              {#if currentStatus}
                <span class="status-dot" style:background={currentStatus.chipColor}></span>
                {t(currentStatus.labelKey)}
              {:else}
                <Icon name="bookmark" size={12} />
                {t('rs.none')}
              {/if}
              <Icon name="chevron_down" size={10} />
            </button>
            {#if statusMenuOpen}
              <ul
                class="status-menu"
                style:top="{statusPos.top}px"
                style:left="{statusPos.left}px"
                use:portal
                use:closeStatusOnOutside={() => (statusMenuOpen = false)}
              >
                {#each READING_STATUSES as s (s.id)}
                  <li>
                    <button
                      class="status-item"
                      class:active={detail.reading_status === s.id}
                      onclick={() => pickStatus(s.id)}
                    >
                      <span class="status-dot" style:background={s.chipColor}></span>
                      <span>{t(s.labelKey)}</span>
                      {#if detail.reading_status === s.id}
                        <Icon name="check" size={11} />
                      {/if}
                    </button>
                  </li>
                {/each}
                {#if detail.reading_status}
                  <li class="status-clear">
                    <button class="status-item" onclick={() => pickStatus(null)}>
                      <span class="status-dot-empty"></span>
                      <span>{t('rs.clear')}</span>
                    </button>
                  </li>
                {/if}
              </ul>
            {/if}
          </div>
          <button
            class="head-btn fav"
            class:on={!!detail.is_favorite}
            onclick={onToggleFavorite}
            use:tooltip={detail.is_favorite ? t('series.unfavorite') : t('series.favorite')}
            data-test="series-fav"
          >
            <Icon name="heart" size={12} />
            {detail.is_favorite ? t('series.favorited') : t('series.favorite')}
          </button>
          <button
            class="head-btn icon-only"
            onclick={onOpenFolder}
            use:tooltip={t('series.open_folder')}
            aria-label={t('series.open_folder')}
            data-test="series-folder"
          >
            <Icon name="folder" size={13} />
          </button>
          <button
            class="head-btn icon-only"
            onclick={() => (editorOpen = true)}
            use:tooltip={t('series.edit')}
            aria-label={t('series.edit')}
            data-test="series-edit"
          >
            <Icon name="pencil" size={13} />
          </button>
        </div>

        {#if detail.tags && detail.tags.length > 0}
          <div class="genres">
            {#each detail.tags as g}
              <span class="genre-chip">{g}</span>
            {/each}
          </div>
        {/if}

        <section class="synopsis">
          <h3>{t('series.synopsis')}</h3>
          <p>{detail.info || t('series.no_synopsis')}</p>
        </section>
      </div>
    </div>

    <section class="chapters">
      <div class="chapters-head">
        <h2>{t('series.chapters')}</h2>
        <div class="head-actions">
          {#if continueChapter && !selectMode}
            <button class="head-btn continue" onclick={onContinue} use:tooltip={t('series.continue')} data-test="series-continue">
              <Icon name="book_open" size={12} />
              {t('series.continue')} {t('series.ch_no')} {continueChapter.chapter_no}
            </button>
          {/if}
          {#if !selectMode}
            <button class="head-btn" onclick={() => (selectMode = true)} use:tooltip={t('series.select')} data-test="series-select-toggle">
              <Icon name="check" size={12} />
              {t('series.select')}
            </button>
          {:else}
            <button class="head-btn" onclick={exitSelectMode} data-test="series-select-exit">
              <Icon name="x" size={12} />
              {t('series.sel.exit')}
            </button>
          {/if}
        </div>
      </div>
      <div class="chapter-list">
        {#each chapters as c (c.chapter_id)}
          <ChapterRow
            chapter={c}
            seriesName={detail.name}
            kind={detail.type}
            isContinue={continueChapter?.chapter_id === c.chapter_id}
            {selectMode}
            selected={selectedIds.has(c.chapter_id)}
            onToggleSelect={() => toggleSelect(c.chapter_id)}
          />
        {/each}
      </div>
    </section>

    {#if selectMode && selectedIds.size > 0}
      <div class="bulk-bar" data-test="series-bulk-bar">
        <span class="bulk-count">{selectedIds.size} {t('series.sel.count')}</span>
        <span class="bulk-spacer"></span>
        <button class="bulk-btn" onclick={clearSelection} data-test="series-bulk-clear">{t('series.sel.clear')}</button>
      </div>
    {/if}

    {#if toastMsg}
      <div class="toast">{toastMsg}</div>
    {/if}
  {/if}
</div>

{#if editorOpen && detail}
  <SeriesEditModal
    series={detail}
    onClose={() => (editorOpen = false)}
    onSaved={onEditorSaved}
    onDeleted={onSeriesDeleted}
  />
{/if}

<style>
  .page { padding: 18px 40px 40px; height: 100%; overflow-y: auto; }
  .topbar { margin-bottom: 18px; }

  .series-hero {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 28px;
    align-items: start;
    margin-bottom: 36px;
    will-change: transform, opacity;
  }
  .cover {
    width: 200px; aspect-ratio: 200/280;
    border-radius: 16px; overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: 0 24px 48px -24px rgba(0,0,0,0.6);
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-fallback {
    width: 100%; height: 100%;
    display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 64px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .cover-skel { width: 200px; aspect-ratio: 200/280; }

  .info { min-width: 0; }
  .info-skel { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
  .skel-line { height: 14px; }
  .w70 { width: 70%; } .w55 { width: 55%; } .w40 { width: 40%; }

  .type-chip {
    display: inline-block; padding: 3px 10px; border-radius: 9999px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    margin-bottom: 10px;
  }
  h1 {
    font-size: 26px; font-weight: 700; line-height: 1.2;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }
  .alias { font-size: 12px; color: var(--text3); margin-bottom: 18px; }

  .meta-grid { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .series-actions {
    display: flex; flex-wrap: wrap; gap: 8px;
    margin-bottom: 18px;
  }
  .head-btn.icon-only {
    width: 28px; height: 28px;
    padding: 0 !important;
    display: inline-flex;
    align-items: center; justify-content: center;
    gap: 0 !important;
    line-height: 0;
  }
  .head-btn.icon-only :global(svg) { display: block; }
  .head-btn.icon-only :global(span) {
    display: inline-flex; align-items: center; justify-content: center;
    line-height: 0;
  }
  .meta-row { display: flex; gap: 12px; font-size: 12px; }
  .meta-label { color: var(--text3); min-width: 80px; }
  .meta-value { color: var(--text); font-weight: 500; }

  .genres {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-bottom: 14px;
  }
  .genre-chip {
    display: inline-block; padding: 3px 10px;
    border-radius: 9999px; font-size: 11px; font-weight: 500;
    background: var(--genre-chip-bg);
    color: var(--genre-chip-fg);
    border: 1px solid var(--genre-chip-border);
  }

  .synopsis {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 12px;
  }
  .synopsis h3 {
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text3);
    margin-bottom: 8px;
  }
  .synopsis p {
    color: var(--text2); line-height: 1.7;
    white-space: pre-wrap;
  }

  .chapters-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
    margin-bottom: 10px; padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }
  .chapters h2 {
    font-size: 12px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
  }
  .head-actions {
    display: flex; gap: 8px; flex-wrap: wrap;
    justify-content: flex-end;
  }
  .head-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600;
    white-space: nowrap; flex-shrink: 0;
    background: rgba(255,255,255,0.04); color: var(--text2);
    border: 1px solid var(--border);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .head-btn:hover:not(:disabled) { background: var(--accent-dim); color: var(--text); border-color: var(--accent); }
  .head-btn.fav.on {
    background: rgba(244, 63, 94, 0.15);
    color: #fda4af;
    border-color: rgba(244, 63, 94, 0.45);
  }
  .head-btn.continue {
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    color: #fff;
    border-color: transparent;
    box-shadow: 0 6px 18px -6px var(--accent-glow);
  }
  .head-btn.continue:hover { filter: brightness(1.1); }
  .head-btn.fav.on:hover { background: rgba(244, 63, 94, 0.22); }
  .head-btn:disabled { opacity: 0.5; cursor: progress; }

  .status-wrap { position: relative; display: inline-flex; }
  .status-btn.on { background: var(--accent-dim); color: var(--text); border-color: var(--accent); }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--text3); flex-shrink: 0;
    box-shadow: 0 0 6px currentColor;
  }
  .status-dot-empty {
    width: 8px; height: 8px; border-radius: 50%;
    background: transparent;
    border: 1px dashed var(--text3);
    flex-shrink: 0;
  }
  .status-menu {
    position: fixed;
    min-width: 200px;
    margin: 0; padding: 4px;
    list-style: none;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.55);
    z-index: 2000;
    animation: status-pop 0.18s var(--ease-out);
  }
  @keyframes status-pop {
    from { opacity: 0; transform: translateY(-4px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .status-clear { border-top: 1px solid var(--border-soft); margin-top: 2px; padding-top: 2px; }
  .status-item {
    width: 100%;
    display: flex; align-items: center; gap: 10px;
    padding: 7px 12px; border-radius: 8px;
    background: transparent; color: var(--text2);
    font-size: 11px; font-weight: 500; text-align: left;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .status-item:hover { background: var(--hover-bg); color: var(--text); }
  .status-item.active { color: var(--text); background: var(--accent-dim); }
  .status-item :global(svg) { margin-left: auto; color: var(--accent); }
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--toast-bg); color: var(--toast-fg);
    padding: 10px 18px; border-radius: 10px;
    font-size: 12px; font-weight: 500;
    border: 1px solid var(--border);
    box-shadow: 0 16px 32px -16px rgba(0,0,0,0.6);
    z-index: 100;
    animation: toast-in 0.2s var(--ease-out);
  }
  @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .chapter-list {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .bulk-bar {
    position: sticky; bottom: 16px;
    margin-top: 16px;
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px;
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid var(--accent);
    border-radius: 9999px;
    box-shadow: 0 10px 30px -10px var(--accent-glow);
    animation: bulk-rise 0.18s var(--ease-out);
    z-index: 10;
  }
  @keyframes bulk-rise {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  .bulk-count { font-size: 12px; font-weight: 600; color: var(--sidebar-hi); }
  .bulk-spacer { flex: 1; }
  .bulk-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 9999px;
    font-size: 11px; font-weight: 600;
    background: rgba(255,255,255,0.05); color: var(--text2);
    border: 1px solid var(--border);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .bulk-btn:hover { background: rgba(255,255,255,0.10); color: var(--text); }

  .empty { padding: 60px 20px; text-align: center; color: var(--text2); }
  .empty.error { color: var(--danger); }
</style>
