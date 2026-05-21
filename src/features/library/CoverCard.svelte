<script module lang="ts">
  // Singleton token: only one context menu open across all cards.
  const OPEN_TOKEN = $state({ v: 0 });
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import { getCoverUrl, invalidateCover } from '../../shared/lib/covers';
  import { TYPE_CHIP, READING_STATUSES } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { openSeries, bumpSeriesMutation } from '../../shared/lib/store.svelte';
  import { setSeriesFavorite, setReadingStatus, deleteOrphanSeries } from '../../shared/lib/api';
  import type { SeriesCard, ReadingStatus } from '../../shared/lib/types';

  type Props = {
    series: SeriesCard;
    delay?: number;
    /** When set, click toggles selection instead of navigating. */
    selectMode?: boolean;
    selected?: boolean;
    onToggleSelect?: (pid: number) => void;
  };
  let {
    series,
    delay = 0,
    selectMode = false,
    selected = false,
    onToggleSelect,
  }: Props = $props();

  function onCardClick() {
    if (selectMode) {
      onToggleSelect?.(series.pid);
      return;
    }
    openSeries(series.pid);
  }

  let coverUrl = $state<string | null>(null);
  let loading = $state(true);
  let cardEl = $state<HTMLButtonElement | null>(null);

  //───── Context menu ─────
  let menuOpen = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let menuEl = $state<HTMLDivElement | null>(null);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let myToken = 0;

  $effect(() => {
    void OPEN_TOKEN.v;
    if (OPEN_TOKEN.v !== myToken && menuOpen) menuOpen = false;
  });

  function openMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    menuX = e.clientX;
    menuY = e.clientY;
    menuOpen = true;
    myToken = ++OPEN_TOKEN.v;
  }
  function closeMenu() { menuOpen = false; }
  function onDocClick(e: MouseEvent) {
    if (!menuOpen) return;
    const tgt = e.target as HTMLElement | null;
    if (tgt && tgt.closest('.ctx-menu')) return;
    menuOpen = false;
  }
  function onDocKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && menuOpen) menuOpen = false;
  }
  // Saved viewport coords go stale once the page scrolls.
  function onDocScroll() {
    if (menuOpen) menuOpen = false;
  }

  // Nudge menu back inside the viewport with 8px padding.
  $effect(() => {
    if (!menuOpen || !menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    let x = menuX;
    let y = menuY;
    if (x + rect.width > vw - pad) x = Math.max(pad, vw - rect.width - pad);
    if (y + rect.height > vh - pad) y = Math.max(pad, vh - rect.height - pad);
    if (x !== menuX) menuX = x;
    if (y !== menuY) menuY = y;
  });
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    const tch = e.touches[0];
    longPressTimer = setTimeout(() => {
      menuX = tch.clientX;
      menuY = tch.clientY;
      menuOpen = true;
      myToken = ++OPEN_TOKEN.v;
    }, 500);
  }
  function clearLongPress() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  // Escape .page-wrap's `will-change: transform` containing block so
  // `position: fixed` anchors to the viewport.
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() { node.remove(); },
    };
  }

  async function actToggleFav() {
    try {
      await setSeriesFavorite(series.pid, series.is_favorite !== 1);
      bumpSeriesMutation();
    } catch { /* non-fatal */ }
    menuOpen = false;
  }
  async function actSetStatus(status: ReadingStatus | null) {
    try {
      await setReadingStatus(series.pid, status);
      bumpSeriesMutation();
    } catch { /* non-fatal */ }
    menuOpen = false;
  }
  async function actDismiss() {
    try {
      const ok = await deleteOrphanSeries(series.pid);
      if (ok) {
        invalidateCover(series.pid);
        bumpSeriesMutation();
      }
    } catch { /* non-fatal */ }
    menuOpen = false;
  }

  const chip = $derived(TYPE_CHIP[series.type] ?? TYPE_CHIP.manga);
  const statusInfo = $derived(
    series.reading_status ? READING_STATUSES.find((s) => s.id === series.reading_status) : null,
  );
  const progress = $derived(
    series.chapter_count > 0
      ? Math.min(100, Math.round((series.local_chapter_count / series.chapter_count) * 100))
      : 0
  );
  const newCount = $derived(
    Math.max(0, series.chapter_count - series.local_chapter_count)
  );

  //───── Cover loading ─────
  // Lazy-fetch via IntersectionObserver — eager fetch of hundreds of
  // covers pegs I/O and spikes memory (blob URLs pinned until LRU evicts).
  async function fetchCover() {
    coverUrl = await getCoverUrl(series.pid);
    loading = false;
  }
  onMount(() => {
    if (typeof IntersectionObserver === 'undefined' || !cardEl) {
      void fetchCover();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            void fetchCover();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(cardEl);
    return () => io.disconnect();
  });
  // Don't revoke — getCoverUrl returns shared URLs owned by the LRU cache.
</script>

<svelte:window onclick={onDocClick} onkeydown={onDocKey} onscrollcapture={onDocScroll} />

<button
  class="card"
  class:select-mode={selectMode}
  class:selected
  style:--delay="{delay}ms"
  type="button"
  bind:this={cardEl}
  data-test="cover-card"
  data-pid={series.pid}
  data-selected={selected ? '1' : '0'}
  onclick={onCardClick}
  oncontextmenu={openMenu}
  ontouchstart={onTouchStart}
  ontouchend={clearLongPress}
  ontouchmove={clearLongPress}
  ontouchcancel={clearLongPress}
>
  <div class="cover">
    {#if loading}
      <Shimmer radius={0} />
    {:else if coverUrl}
      <img src={coverUrl} alt={series.name} loading="lazy" />
    {:else}
      <div class="cover-placeholder">
        <span>{series.name.charAt(0)}</span>
      </div>
    {/if}
    {#if selectMode}
      <span class="sel-mark" class:on={selected} aria-hidden="true">
        {#if selected}
          <Icon name="check" size={12} />
        {/if}
      </span>
    {/if}

    <div class="chips">
      <span class="chip type" style:background={chip.bg} style:color={chip.fg}>
        {t(chip.labelKey)}
      </span>
    </div>

    {#if newCount > 0}
      <div class="new-badge">+{newCount}</div>
    {/if}

    {#if series.is_favorite}
      <div class="fav-badge" use:tooltip={"Favorite"}>
        <Icon name="heart" size={11} />
      </div>
    {/if}

    {#if statusInfo}
      <div class="rs-badge" style:--rs={statusInfo.chipColor} use:tooltip={t(statusInfo.labelKey)}>
        <span class="rs-dot"></span>
        {t(statusInfo.labelKey)}
      </div>
    {/if}

    <div class="progress">
      <div class="bar" style:width="{progress}%"></div>
    </div>
  </div>

  <div class="info">
    <div class="title" use:tooltip={series.name}>{series.name}</div>
    <div class="meta">
      {series.local_chapter_count} / {series.chapter_count} {t('series.ch')}
    </div>
  </div>
</button>

{#if menuOpen}
  <div
    bind:this={menuEl}
    class="ctx-menu"
    style:left="{menuX}px"
    style:top="{menuY}px"
    role="menu"
    use:portal
    transition:scale={{ duration: 160, start: 0.92, easing: cubicOut }}
    data-test="card-ctx-menu"
  >
    <button class="ctx-item" type="button" onclick={actToggleFav} data-test="card-ctx-fav">
      <Icon name="heart" size={12} />
      {series.is_favorite === 1 ? t('card.menu.unfavorite') : t('card.menu.favorite')}
    </button>
    <div class="ctx-sep"></div>
    <div class="ctx-label">{t('card.menu.set_status')}</div>
    {#each READING_STATUSES as rs (rs.id)}
      <button
        class="ctx-item ctx-status"
        class:active={series.reading_status === rs.id}
        type="button"
        onclick={() => actSetStatus(rs.id as ReadingStatus)}
        data-test={`card-ctx-rs-${rs.id}`}
      >
        <span class="rs-dot" style:background={rs.chipColor}></span>
        {t(rs.labelKey)}
      </button>
    {/each}
    {#if series.reading_status}
      <button class="ctx-item" type="button" onclick={() => actSetStatus(null)} data-test="card-ctx-clear">
        <Icon name="x" size={10} />
        {t('card.menu.clear_status')}
      </button>
    {/if}
  </div>
{/if}

<style>
  .ctx-menu {
    position: fixed;
    z-index: 2000;
    min-width: 200px;
    padding: 4px;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.55), 0 2px 8px -2px rgba(0,0,0,0.4);
    transform-origin: top left;
  }
  .ctx-item {
    width: 100%;
    display: flex; align-items: center; gap: 8px;
    padding: 7px 12px;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-size: 12px; font-weight: 500;
    text-align: left;
    transition: background 0.12s var(--ease-out);
  }
  .ctx-item:hover { background: var(--hover-bg); }
  .ctx-item.active { color: var(--sidebar-hi); background: var(--accent-dim); }
  .ctx-sep {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }
  .ctx-label {
    padding: 4px 12px 2px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text3);
  }
  .ctx-status .rs-dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 4px currentColor;
  }
  .card {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    text-align: left;
    padding: 0; color: inherit;
    opacity: 0; transform: translateY(8px);
    animation: fade-in-up 0.5s var(--ease-out) forwards;
    animation-delay: var(--delay);
    transition:
      transform 0.25s var(--ease-out),
      border-color 0.25s var(--ease-out),
      box-shadow 0.25s var(--ease-out);
  }
  .card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: 0 18px 40px -22px var(--accent-glow), 0 2px 0 0 rgba(255,255,255,0.04) inset;
  }
  .cover {
    position: relative; width: 100%;
    aspect-ratio: 160 / 220;
    overflow: hidden; background: #1a1a25;
  }
  .cover img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.6s var(--ease-out);
  }
  .card:hover .cover img { transform: scale(1.06); }

  /* Selection mode: dimmed unselected cards + accent ring on selected. */
  .card.select-mode { cursor: pointer; }
  .card.select-mode:not(.selected) { opacity: 0.62; }
  .card.select-mode.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent), 0 8px 22px -10px color-mix(in srgb, var(--accent) 80%, transparent);
    transform: translateY(-2px);
  }
  .sel-mark {
    position: absolute;
    top: 8px; right: 8px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: rgba(0,0,0,0.42);
    border: 2px solid #fff;
    display: inline-flex; align-items: center; justify-content: center;
    color: #fff;
    transition: background 0.16s var(--ease-out), transform 0.16s var(--ease-out);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 3;
  }
  .sel-mark.on {
    background: var(--accent);
    border-color: #fff;
    transform: scale(1.08);
  }
  .cover-placeholder {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 48px; font-weight: 700;
    color: rgba(255,255,255,0.4);
  }
  .chips {
    position: absolute; top: 8px; left: 8px; right: 8px;
    display: flex; justify-content: space-between;
    pointer-events: none;
  }
  .chip {
    position: relative;
    isolation: isolate;
    display: inline-flex; align-items: center;
    padding: 2px 9px; border-radius: 9999px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    /* Outline + text shadow for legibility over arbitrary cover art. */
    box-shadow: 0 0 0 1px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.35);
    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  }
  /* Dark scrim under the translucent chip bg. */
  .chip.type::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: inherit;
    background: rgba(0,0,0,0.45);
    z-index: -1;
  }
  .new-badge {
    position: absolute; top: 36px; right: 8px;
    background: var(--accent); color: #fff;
    font-size: 10px; font-weight: 700;
    padding: 2px 7px; border-radius: 9999px;
    box-shadow: 0 4px 12px -2px var(--accent-glow);
  }
  .fav-badge {
    position: absolute; bottom: 8px; right: 8px;
    width: 22px; height: 22px;
    display: grid; place-items: center;
    background: rgba(244, 63, 94, 0.95); color: #fff;
    border-radius: 9999px;
    box-shadow: 0 4px 12px -2px rgba(244, 63, 94, 0.55);
  }
  .rs-badge {
    position: absolute; bottom: 10px; left: 8px;
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px;
    border-radius: 9999px;
    background: rgba(0,0,0,0.65);
    color: #fff;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    backdrop-filter: blur(6px);
    border: 1px solid color-mix(in srgb, var(--rs) 70%, transparent);
  }
  .rs-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--rs);
    box-shadow: 0 0 5px var(--rs);
  }
  .progress {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: rgba(0,0,0,0.45);
  }
  .bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #a78bfa);
    box-shadow: 0 0 8px var(--accent-glow);
    transition: width 0.4s var(--ease-out);
  }
  .info { padding: 10px 12px 12px; }
  .title {
    font-size: 13px; font-weight: 600; color: var(--text);
    margin-bottom: 3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .meta { font-size: 11px; color: var(--text2); }
</style>
