<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { tooltip } from '../../shared/lib/tooltip';
  import CoverCard from '../library/CoverCard.svelte';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import { listFavoriteSeries } from '../../shared/lib/api';
  import { ANIM, LIBRARY_FILTERS } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { app } from '../../shared/lib/store.svelte';
  import type { SeriesCard } from '../../shared/lib/types';

  const SKELETON_KEY = 'aan.favorites.lastCount';
  const skeletonCount = (() => {
    const n = parseInt(localStorage.getItem(SKELETON_KEY) ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : 0;
  })();

  let series = $state<SeriesCard[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Restrict the chip set to types that appear among favorites.
  let typeFilter = $state<string>(((): string => {
    const v = localStorage.getItem('aan.fav.type');
    return v ?? 'all';
  })());
  $effect(() => { try { localStorage.setItem('aan.fav.type', typeFilter); } catch {} });

  // Multi-select; only tags present on at least one favorited series.
  let selectedTags = $state<string[]>(((): string[] => {
    try {
      const raw = localStorage.getItem('aan.fav.tags');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
    } catch { return []; }
  })());
  $effect(() => {
    try { localStorage.setItem('aan.fav.tags', JSON.stringify(selectedTags)); } catch {}
  });
  let tagCombo = $state<'or' | 'and'>(((): 'or' | 'and' => {
    const v = localStorage.getItem('aan.fav.tag_combo');
    return v === 'and' ? 'and' : 'or';
  })());
  $effect(() => { try { localStorage.setItem('aan.fav.tag_combo', tagCombo); } catch {} });

  // Re-fetch when seriesMutationTick bumps (fav toggled elsewhere).
  let lastSeenTick = -1;
  $effect(() => {
    const t = app.seriesMutationTick;
    if (t > 0 && t !== lastSeenTick) {
      lastSeenTick = t;
      void listFavoriteSeries().then((s) => { series = s; }).catch(() => {});
    }
  });

  onMount(async () => {
    try {
      series = await listFavoriteSeries();
      try { localStorage.setItem(SKELETON_KEY, String(series.length)); } catch {}
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  // Types present among favorites, keyed by LIBRARY_FILTERS id to reuse
  // their localized labels. 'all' is always first.
  const availableTypes = $derived.by(() => {
    const present = new Set(series.map((s) => s.type));
    return LIBRARY_FILTERS.filter((f) => f.id === 'all' || present.has(f.id));
  });

  // Tag → count over favorites; sorted by count desc then name for stability.
  const availableTags = $derived.by(() => {
    const m = new Map<string, number>();
    for (const s of series) {
      for (const tg of s.tags ?? []) m.set(tg, (m.get(tg) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  });

  // Drop stale filters when de-favoriting removes their last match,
  // otherwise the grid goes empty for a non-obvious reason. Gate on
  // !loading so the initial mount doesn't reset a persisted filter
  // before the catalog arrives.
  $effect(() => {
    if (loading) return;
    if (typeFilter !== 'all' && !availableTypes.find((f) => f.id === typeFilter)) {
      typeFilter = 'all';
    }
  });
  $effect(() => {
    if (loading) return;
    const tagSet = new Set(availableTags.map((t) => t.name));
    const pruned = selectedTags.filter((t) => tagSet.has(t));
    if (pruned.length !== selectedTags.length) selectedTags = pruned;
  });

  function toggleTag(name: string) {
    selectedTags = selectedTags.includes(name)
      ? selectedTags.filter((x) => x !== name)
      : [...selectedTags, name];
  }
  function clearTags() { selectedTags = []; }

  function typeCount(id: string): number {
    if (id === 'all') return series.length;
    return series.filter((s) => s.type === id).length;
  }

  const filtered = $derived.by(() => {
    return series.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (selectedTags.length > 0) {
        const tags = s.tags ?? [];
        const fn = tagCombo === 'and' ? 'every' : 'some';
        if (!selectedTags[fn]((g) => tags.includes(g))) return false;
      }
      return true;
    });
  });

  const activeFilterCount = $derived(
    selectedTags.length + (typeFilter !== 'all' ? 1 : 0),
  );
</script>

<div class="page" data-test="favorites-page">
  <header class="hero">
    <div>
      <h1>{t('favorites.title')}</h1>
      <p class="sub">{t('favorites.sub')}</p>
    </div>
    <div class="counter">
      <Icon name="heart" size={12} />
      <span class="count">{filtered.length}{filtered.length !== series.length ? ` / ${series.length}` : ''}</span>
    </div>
  </header>

  {#if !loading && series.length > 0}
    <div class="filters-bar">
      <div class="type-row">
        {#each availableTypes as f (f.id)}
          {@const count = typeCount(f.id)}
          <button
            class="filter"
            class:active={typeFilter === f.id}
            onclick={() => (typeFilter = f.id)}
            data-test={`filter-type-${f.id}`}
          >
            {t(f.labelKey)}
            <span class="filter-count" class:zero={count === 0}>{count}</span>
          </button>
        {/each}
      </div>

      {#if availableTags.length > 0}
        <section class="genre-section">
          <h4 class="section-label">{t('library.filters.genre')}</h4>
          <div class="genre-pills">
            {#each availableTags as g (g.name)}
              {@const sel = selectedTags.includes(g.name)}
              <button
                class="genre-pill"
                class:selected={sel}
                onclick={() => toggleTag(g.name)}
              >
                <span class="genre-name">{g.name}</span>
                <span class="genre-count">{g.count}</span>
              </button>
            {/each}
            {#if selectedTags.length >= 2}
              <div class="combo-seg" use:tooltip={t('genre.combo.desc')}>
                <button
                  class="combo-btn"
                  class:active={tagCombo === 'or'}
                  onclick={() => (tagCombo = 'or')}
                >{t('genre.combo.or')}</button>
                <button
                  class="combo-btn"
                  class:active={tagCombo === 'and'}
                  onclick={() => (tagCombo = 'and')}
                >{t('genre.combo.and')}</button>
              </div>
            {/if}
            {#if selectedTags.length > 0}
              <button class="clear-tags" onclick={clearTags}>{t('genre.clear')}</button>
            {/if}
          </div>
        </section>
      {/if}

      {#if activeFilterCount > 0 && filtered.length === 0}
        <div class="filter-hint">{t('favorites.filter_empty')}</div>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="empty error">{error}</div>
  {:else if loading && skeletonCount > 0}
    <div class="grid" out:fade={{ duration: 160, easing: cubicOut }}>
      {#each Array(skeletonCount) as _, i}
        <div
          class="skeleton"
          style:--delay="{Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)}ms"
        >
          <Shimmer radius={12} height="100%" />
        </div>
      {/each}
    </div>
  {:else if series.length === 0}
    <div class="empty" data-test="favorites-empty">
      <Icon name="heart" size={28} />
      <p>{t('favorites.empty')}</p>
      <p class="hint">{t('favorites.empty.hint')}</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty">
      <Icon name="heart" size={28} />
      <p>{t('favorites.filter_empty')}</p>
    </div>
  {:else}
    <div class="grid" in:fade={{ duration: 240, delay: 120, easing: cubicOut }}>
      {#each filtered as s, i (s.pid)}
        <CoverCard series={s} delay={Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 28px 40px 40px; height: 100%; overflow-y: auto; }
  .hero { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; }
  .hero h1 {
    font-size: 28px; font-weight: 700; letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, #fda4af 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }
  .sub { font-size: 12px; color: var(--text2); }
  .counter {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    background: rgba(244, 63, 94, 0.12);
    border: 1px solid rgba(244, 63, 94, 0.35);
    border-radius: 9999px;
    color: #fda4af;
    line-height: 1;
  }
  .count { font-size: 16px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }

  .filters-bar {
    display: flex; flex-direction: column; gap: 14px;
    margin-bottom: 22px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-soft, var(--border));
    border-radius: 12px;
  }
  .type-row {
    display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
  }
  .genre-section {
    display: flex; flex-direction: column; gap: 8px;
  }
  .section-label {
    margin: 0;
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text3);
  }
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
      color 0.18s var(--ease-out);
  }
  .filter:hover { background: var(--surface2); color: var(--text); }
  .filter.active {
    background: var(--accent); border-color: var(--accent);
    color: #fff; font-weight: 600;
    box-shadow: 0 6px 16px -6px var(--accent-glow);
  }
  .filter-count {
    font-size: 10px; padding: 2px 6px; border-radius: 9999px;
    background: rgba(255,255,255,0.18);
    color: inherit; font-weight: 700;
    min-height: 14px; min-width: 18px;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .filter:not(.active) .filter-count { background: var(--surface2); }
  .filter-count.zero { visibility: hidden; }

  .genre-pills {
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  }
  .genre-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 11px; border-radius: 9999px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.03);
    color: var(--text2);
    font-size: 11px; font-weight: 500;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .genre-pill:hover { background: var(--surface2); color: var(--text); }
  .genre-pill.selected {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--text);
    font-weight: 600;
  }
  .genre-name { line-height: 1; }
  .genre-count {
    font-size: 9px; padding: 1px 6px; border-radius: 9999px;
    background: rgba(255,255,255,0.10);
    color: inherit; font-weight: 700;
    line-height: 1.4;
  }
  .combo-seg {
    display: inline-flex; gap: 1px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 2px;
  }
  .combo-btn {
    padding: 2px 10px; border-radius: 9999px;
    background: transparent; color: var(--text3);
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .combo-btn:hover { color: var(--text); }
  .combo-btn.active { background: var(--accent); color: #fff; }
  .clear-tags {
    padding: 4px 11px; border-radius: 9999px;
    border: 1px dashed var(--border);
    background: transparent; color: var(--text3);
    font-size: 11px; font-weight: 500;
    transition: color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .clear-tags:hover { color: var(--text); border-color: var(--accent); }
  .filter-hint {
    font-size: 11px; color: var(--text3);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 18px;
  }
  .skeleton {
    aspect-ratio: 160 / 280;
    border-radius: var(--radius-lg);
    overflow: hidden;
    opacity: 0;
    transform: translateY(8px);
    animation: fade-in-up 0.5s var(--ease-out) forwards;
    animation-delay: var(--delay);
  }

  .empty {
    padding: 60px 20px; text-align: center;
    color: var(--text2); font-size: 13px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .empty.error { color: var(--danger); }
  .empty .hint { color: var(--text3); font-size: 11px; }
</style>
