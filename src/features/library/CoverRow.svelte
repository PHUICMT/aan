<script lang="ts">
  import { onMount } from 'svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import Icon from '../../shared/components/Icon.svelte';
  import { getCoverUrl } from '../../shared/lib/covers';
  import { TYPE_CHIP, READING_STATUSES } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { openSeries } from '../../shared/lib/store.svelte';
  import type { SeriesCard } from '../../shared/lib/types';

  type Props = {
    series: SeriesCard;
    delay?: number;
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

  function onRowClick() {
    if (selectMode) {
      onToggleSelect?.(series.pid);
      return;
    }
    openSeries(series.pid);
  }

  let coverUrl = $state<string | null>(null);
  let rowEl = $state<HTMLButtonElement | null>(null);

  const chip = $derived(TYPE_CHIP[series.type] ?? TYPE_CHIP.manga);
  const statusInfo = $derived(
    series.reading_status ? READING_STATUSES.find((s) => s.id === series.reading_status) : null,
  );
  const progress = $derived(
    series.chapter_count > 0
      ? Math.min(100, Math.round((series.local_chapter_count / series.chapter_count) * 100))
      : 0,
  );

  // Lazy-fetch on viewport intersect — see CoverCard.
  async function fetchCover() {
    coverUrl = await getCoverUrl(series.pid);
  }
  onMount(() => {
    if (typeof IntersectionObserver === 'undefined' || !rowEl) {
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
    io.observe(rowEl);
    return () => io.disconnect();
  });
</script>

<button
  class="row"
  class:select-mode={selectMode}
  class:selected
  style:--delay="{delay}ms"
  bind:this={rowEl}
  data-test="cover-row"
  data-pid={series.pid}
  data-selected={selected ? '1' : '0'}
  onclick={onRowClick}
>
  <div class="cover">
    {#if coverUrl}
      <img src={coverUrl} alt={series.name} loading="lazy" />
    {:else}
      <div class="cover-fb">{series.name.charAt(0)}</div>
    {/if}
  </div>
  <div class="meta">
    <div class="line1">
      <span class="chip" style:background={chip.bg} style:color={chip.fg}>
        {t(chip.labelKey)}
      </span>
      {#if statusInfo}
        <span class="rs-pill" style:--rs={statusInfo.chipColor}>
          <span class="rs-dot"></span>
          {t(statusInfo.labelKey)}
        </span>
      {/if}
      <span class="name" use:tooltip={series.name}>{series.name}</span>
      {#if series.is_favorite}
        <span class="fav"><Icon name="heart" size={11} /></span>
      {/if}
    </div>
    <div class="line2">
      <span class="ch-count">{series.local_chapter_count} / {series.chapter_count} {t('series.ch')}</span>
    </div>
    <div class="prog">
      <div class="bar"><div class="fill" style:width="{progress}%"></div></div>
      <span class="pct">{progress}%</span>
    </div>
  </div>
  {#if selectMode}
    <span class="sel-mark" class:on={selected} aria-hidden="true">
      {#if selected}
        <Icon name="check" size={12} />
      {/if}
    </span>
  {:else}
    <span class="chev" aria-hidden="true">
      <Icon name="chevron_right" size={14} />
    </span>
  {/if}
</button>

<style>
  .row {
    display: grid; grid-template-columns: 48px 1fr auto;
    gap: 14px; align-items: center;
    padding: 10px 18px 10px 14px;
    overflow: hidden;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-align: left;
    color: var(--text3);
    opacity: 0; transform: translateY(6px);
    animation: fade-in-up 0.4s var(--ease-out) forwards;
    animation-delay: var(--delay);
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), transform 0.15s var(--ease-out);
  }
  .row:hover { background: var(--surface2); border-color: var(--accent); transform: translateY(-1px); }
  .row.select-mode { cursor: pointer; }
  .row.select-mode:not(.selected) { opacity: 0.62; }
  .row.select-mode.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .sel-mark {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: rgba(0,0,0,0.42);
    border: 2px solid #fff;
    display: inline-flex; align-items: center; justify-content: center;
    color: #fff;
    transition: background 0.16s var(--ease-out), transform 0.16s var(--ease-out);
  }
  .sel-mark.on {
    background: var(--accent);
    transform: scale(1.08);
  }
  .chev {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 26px;
    border-radius: 9999px;
    color: var(--text3);
    background: transparent;
    transition: transform 0.22s var(--ease-out), color 0.22s var(--ease-out), background 0.22s var(--ease-out);
  }
  .row:hover .chev {
    transform: translateX(3px);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .cover {
    position: relative;
    width: 48px; height: 68px; border-radius: 6px; overflow: hidden;
    border: 1px solid var(--border); background: #14182a;
    flex-shrink: 0;
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-fb {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .line1 { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .chip {
    padding: 1px 7px; border-radius: 9999px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .rs-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 1px 8px; border-radius: 9999px;
    background: color-mix(in srgb, var(--rs) 18%, transparent);
    color: var(--text);
    font-size: 9px; font-weight: 700;
    flex-shrink: 0;
  }
  .rs-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--rs);
    box-shadow: 0 0 5px var(--rs);
  }
  .name {
    font-size: 13px; font-weight: 600; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .fav { color: #f87171; }
  .line2 { display: flex; align-items: center; gap: 10px; }
  .ch-count { font-size: 11px; color: var(--text2); }
  .prog { display: flex; align-items: center; gap: 8px; }
  .bar { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.08); overflow: hidden; }
  .fill { height: 100%; background: var(--accent); transition: width 0.3s var(--ease-out); }
  .pct { font-size: 10px; color: var(--text3); font-variant-numeric: tabular-nums; min-width: 30px; text-align: right; }
</style>
