<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import SegmentedControl from '../../shared/components/ui/SegmentedControl.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import {
    app,
    toggleFavTag,
    toggleSelectedTag,
    clearSelectedTags,
    setTagCombo,
  } from '../../shared/lib/store.svelte';
  import type { TagCount } from '../../shared/lib/types';
  import {
    RS_FILTERS,
    type LibraryFilters,
  } from './composables/useLibraryFilters.svelte';

  type Props = {
    filters: LibraryFilters;
    tags: TagCount[];
    loading: boolean;
    skeletonOnly?: boolean;
  };

  let { filters, tags, loading, skeletonOnly = false }: Props = $props();

  let showAllTags = $state(false);

  // Favorites first (preserving fav order), then by count desc.
  const sortedTags = $derived.by(() => {
    const fav = new Set(app.favTags);
    const favList = app.favTags
      .map((name) => tags.find((g) => g.name === name))
      .filter((g): g is TagCount => !!g);
    const rest = tags.filter((g) => !fav.has(g.name));
    return [...favList, ...rest];
  });
  const visibleTags = $derived(showAllTags ? sortedTags : sortedTags.slice(0, 12));
</script>

<div class="filters-disclosure">
  <div class="filters-row">
    {#if skeletonOnly}
      <div class="filters-toggle-skel"><Shimmer radius={9999} height="100%" /></div>
    {:else}
      <button
        class="filters-toggle"
        class:open={filters.filtersOpen}
        onclick={() => (filters.filtersOpen = !filters.filtersOpen)}
        aria-expanded={filters.filtersOpen}
        data-test="library-filters-toggle"
      >
        <Icon name="settings" size={12} />
        <span>{t('library.filters')}</span>
        {#if filters.activeFilterCount > 0}
          <span class="filters-count" data-test="library-filter-count">{filters.activeFilterCount}</span>
        {/if}
        <span class="filters-caret" class:flip={filters.filtersOpen}>
          <Icon name="chevron_down" size={11} />
        </span>
      </button>
    {/if}
    <SegmentedControl
      variant="icons"
      ariaLabel="View mode"
      value={filters.viewMode}
      onChange={(v) => filters.setView(v)}
      options={[
        { value: 'grid',    icon: 'layout_grid',    tooltip: t('library.view.grid'),    testId: 'view-grid' },
        { value: 'compact', icon: 'layout_compact', tooltip: t('library.view.compact'), testId: 'view-compact' },
        { value: 'list',    icon: 'layout_list',    tooltip: t('library.view.list'),    testId: 'view-list' },
      ]}
    />
  </div>
  {#if !skeletonOnly && filters.filtersOpen}
    <div class="filters-panel" transition:slide={{ duration: 260, easing: cubicOut }}>
      <section class="filter-section">
        <h4 class="section-label">{t('library.filters.reading_status')}</h4>
        <div class="status-pills">
          {#each RS_FILTERS as f (f.id)}
            {@const count = filters.rsCount(f.id)}
            <button
              class="filter status-filter"
              class:active={filters.rsFilter === f.id}
              onclick={() => (filters.rsFilter = f.id)}
              data-test={`filter-rs-${f.id}`}
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
      </section>
      <section class="filter-section">
        <h4 class="section-label">{t('library.filters.tag')}</h4>
        <div class="tag-pills">
          {#each visibleTags as g (g.name)}
            {@const isFav = app.favTags.includes(g.name)}
            {@const isSelected = app.selectedTags.includes(g.name)}
            <div class="tag-pill" class:selected={isSelected} class:fav={isFav} data-test="tag-pill" data-tag={g.name}>
              <button class="tag-name" onclick={() => toggleSelectedTag(g.name)}>
                {g.name}
                <span class="tag-count">{g.count}</span>
              </button>
              <button
                class="fav-btn"
                class:on={isFav}
                onclick={() => toggleFavTag(g.name)}
                use:tooltip={isFav ? t('tag.unfav') : t('tag.fav')}
                aria-label={isFav ? t('tag.unfav') : t('tag.fav')}
              >★</button>
            </div>
          {/each}
          {#if sortedTags.length > 12}
            <button class="show-all" onclick={() => (showAllTags = !showAllTags)}>
              {showAllTags ? t('tag.show_less') : t('tag.show_all').replace('{n}', String(sortedTags.length - 12))}
            </button>
          {/if}
          {#if app.selectedTags.length >= 2}
            <div class="combo-seg" use:tooltip={t('tag.combo.desc')}>
              <button
                class="combo-btn"
                class:active={app.tagCombo === 'or'}
                onclick={() => setTagCombo('or')}
                data-test="tag-combo-or"
              >{t('tag.combo.or')}</button>
              <button
                class="combo-btn"
                class:active={app.tagCombo === 'and'}
                onclick={() => setTagCombo('and')}
                data-test="tag-combo-and"
              >{t('tag.combo.and')}</button>
            </div>
          {/if}
          {#if app.selectedTags.length > 0}
            <button class="clear-tags" onclick={clearSelectedTags}>{t('tag.clear')}</button>
          {/if}
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
  .filters-disclosure { margin: -8px 0 18px; }
  .filters-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  .filters-toggle {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 9999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text2);
    font-size: 11px; font-weight: 600;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .filters-toggle:hover, .filters-toggle.open { background: var(--hover-bg); color: var(--text); border-color: var(--accent); }
  .filters-count {
    font-size: 9px; padding: 1px 7px; border-radius: 9999px;
    background: var(--accent); color: #fff; font-weight: 700;
  }
  .filters-caret { display: inline-flex; transition: transform 0.2s var(--ease-out); }
  .filters-caret.flip { transform: rotate(180deg); }
  .filters-toggle-skel {
    display: inline-block;
    width: 96px; height: 28px;
    border-radius: 9999px;
    overflow: hidden;
  }

  .filters-panel {
    display: flex; flex-direction: column; gap: 14px;
    padding: 12px 14px 14px;
    margin-top: 6px;
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
  }
  .filter-section { display: flex; flex-direction: column; gap: 8px; }
  .section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text3);
  }
  .status-pills { display: flex; flex-wrap: wrap; gap: 4px; }
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
  @keyframes count-in {
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
  }

  .tag-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag-pill {
    display: inline-flex; align-items: stretch;
    border: 1px solid var(--border);
    border-radius: 9999px;
    background: rgba(255,255,255,0.03);
    overflow: hidden;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .tag-pill:hover { background: var(--surface2); }
  .tag-pill.selected {
    background: var(--accent-dim);
    border-color: var(--accent);
  }
  .tag-pill.fav { border-color: rgba(251, 191, 36, 0.45); }
  .tag-name {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 4px 4px 11px;
    font-size: 11px; font-weight: 500;
    color: var(--text2);
    background: transparent;
  }
  .tag-pill.selected .tag-name { color: var(--text); font-weight: 600; }
  .tag-count {
    font-size: 9px; padding: 1px 6px; border-radius: 9999px;
    background: rgba(255,255,255,0.10); color: inherit; font-weight: 700;
  }
  .fav-btn {
    width: 22px; padding: 0 6px 0 2px;
    font-size: 11px; line-height: 1;
    color: var(--text3); background: transparent;
    transition: color 0.15s var(--ease-out);
  }
  .fav-btn:hover { color: #fbbf24; }
  .fav-btn.on { color: #fbbf24; }
  .show-all, .clear-tags {
    padding: 4px 11px; border-radius: 9999px;
    border: 1px dashed var(--border);
    background: transparent; color: var(--text3);
    font-size: 11px; font-weight: 500;
    transition: color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .show-all:hover, .clear-tags:hover { color: var(--text); border-color: var(--accent); }
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

</style>
