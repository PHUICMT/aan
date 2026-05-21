<script lang="ts">
  import { onMount } from 'svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import CoverCard from '../library/CoverCard.svelte';
  import CoverRow from '../library/CoverRow.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import SegmentedControl from '../../shared/components/ui/SegmentedControl.svelte';
  import { listLocalSeries } from '../../shared/lib/api';
  import { ANIM, READING_STATUSES } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { app } from '../../shared/lib/store.svelte';
  import type { SeriesCard } from '../../shared/lib/types';

  const SKELETON_KEY_PREFIX = 'aan.list.lastCount.';
  let series = $state<SeriesCard[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let query = $state('');

  type ViewMode = 'grid' | 'compact' | 'list';
  let viewMode = $state<ViewMode>(((): ViewMode => {
    const v = localStorage.getItem('aan.list.view');
    return v === 'compact' || v === 'list' ? v : 'grid';
  })());
  function setView(v: ViewMode) {
    const apply = () => {
      viewMode = v;
      try { localStorage.setItem('aan.list.view', v); } catch {}
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  }

  const statusInfo = $derived(READING_STATUSES.find((s) => s.id === app.listStatus));
  const skeletonCount = $derived.by(() => {
    const n = parseInt(localStorage.getItem(SKELETON_KEY_PREFIX + app.listStatus) ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : 0;
  });

  onMount(async () => {
    try {
      series = await listLocalSeries();
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  const filtered = $derived.by(() => {
    const lockedStatus = app.listStatus;
    const out = series.filter((s) => s.reading_status === lockedStatus);
    if (query.trim()) {
      const q = query.toLowerCase();
      return out.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.alias ?? '').toLowerCase().includes(q),
      );
    }
    return out;
  });

  $effect(() => {
    if (!loading) {
      try { localStorage.setItem(SKELETON_KEY_PREFIX + app.listStatus, String(filtered.length)); } catch {}
    }
  });
</script>

<div class="page" data-test="reading-list">
  <header class="hero">
    <div class="hero-l">
      {#if statusInfo}
        <span class="rs-dot" style:background={statusInfo.chipColor}></span>
      {/if}
      <div>
        <h1>{statusInfo ? t(statusInfo.labelKey) : t('nav.lists')}</h1>
        <p class="sub">{t('list.sub')}</p>
      </div>
    </div>
    <div class="counter">
      {#if loading}
        <span class="count-skel"><Shimmer radius={4} height="100%" /></span>
      {:else}
        <span class="count">{filtered.length}</span>
      {/if}
      <span class="count-label">{t('library.series')}</span>
    </div>
  </header>

  <div class="toolbar">
    <input bind:value={query} placeholder={t('library.search')} class="search" />
    <SegmentedControl
      variant="icons"
      ariaLabel="View mode"
      value={viewMode}
      onChange={(v) => setView(v)}
      options={[
        { value: 'grid',    icon: 'layout_grid',    tooltip: t('library.view.grid') },
        { value: 'compact', icon: 'layout_compact', tooltip: t('library.view.compact') },
        { value: 'list',    icon: 'layout_list',    tooltip: t('library.view.list') },
      ]}
    />
  </div>

  {#if error}
    <div class="empty error">{error}</div>
  {:else if loading && skeletonCount > 0}
    <div class="grid">
      {#each Array(skeletonCount) as _, i (i)}
        <div class="skeleton" style:--delay="{Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)}ms">
          <Shimmer radius={12} height="100%" />
        </div>
      {/each}
    </div>
  {:else if filtered.length === 0}
    <div class="empty">
      <p>{t('list.empty')}</p>
      <p class="hint">{t('list.empty.hint')}</p>
    </div>
  {:else if viewMode === 'list'}
    <div class="list-view">
      {#each filtered as s, i (s.pid)}
        <CoverRow series={s} delay={Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)} />
      {/each}
    </div>
  {:else}
    <div class="grid mode-{viewMode}">
      {#each filtered as s, i (s.pid)}
        <CoverCard series={s} delay={Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 28px 40px 40px; height: 100%; overflow-y: auto; }
  .hero {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-bottom: 22px;
  }
  .hero-l { display: flex; align-items: center; gap: 14px; }
  .rs-dot {
    width: 14px; height: 14px; border-radius: 50%;
    box-shadow: 0 0 10px currentColor;
  }
  .hero h1 {
    font-size: 28px; font-weight: 700; letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }
  .sub { font-size: 12px; color: var(--text2); }
  .counter {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    background: var(--accent-dim);
    border: 1px solid var(--accent);
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
    width: 22px; height: 18px; border-radius: 4px; overflow: hidden;
  }
  .count-label { font-size: 11px; color: var(--text2); line-height: 1; }
  .toolbar { margin-bottom: 22px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .search {
    flex: 1; min-width: 200px; max-width: 420px;
    padding: 8px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 9999px;
    font-size: 12px; outline: none;
    transition: border-color 0.18s var(--ease-out), background 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out);
  }
  .search:focus { border-color: var(--accent); background: rgba(255,255,255,0.06); box-shadow: 0 0 0 3px var(--accent-dim); }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 18px;
    transition: grid-template-columns 0.28s var(--ease-out), gap 0.28s var(--ease-out);
  }
  .grid.mode-compact { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation-duration: 0.28s;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  .list-view { display: flex; flex-direction: column; gap: 8px; }
  .skeleton {
    aspect-ratio: 160 / 280;
    border-radius: var(--radius-lg);
    overflow: hidden;
    opacity: 0; transform: translateY(8px);
    animation: fade-in-up 0.5s var(--ease-out) forwards;
    animation-delay: var(--delay);
  }
  .empty { padding: 60px 20px; text-align: center; color: var(--text2); font-size: 13px; }
  .empty.error { color: var(--danger); }
  .empty .hint { color: var(--text3); font-size: 11px; margin-top: 6px; }
</style>
