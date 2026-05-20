<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import {
    app,
    toggleFavGenre,
    toggleSelectedGenre,
    clearSelectedGenres,
    setGenreCombo,
  } from '../../shared/lib/store.svelte';
  import type { GenreCount } from '../../shared/lib/types';
  import {
    STATUS_FILTERS, DL_FILTERS, RS_FILTERS,
    type LibraryFilters,
  } from './composables/useLibraryFilters.svelte';

  type Props = {
    filters: LibraryFilters;
    genres: GenreCount[];
    loading: boolean;
    skeletonOnly?: boolean;
  };

  let { filters, genres, loading, skeletonOnly = false }: Props = $props();

  let showAllGenres = $state(false);

  // Favorites first (preserving fav order), then by count desc.
  const sortedGenres = $derived.by(() => {
    const fav = new Set(app.favGenres);
    const favList = app.favGenres
      .map((name) => genres.find((g) => g.name === name))
      .filter((g): g is GenreCount => !!g);
    const rest = genres.filter((g) => !fav.has(g.name));
    return [...favList, ...rest];
  });
  const visibleGenres = $derived(showAllGenres ? sortedGenres : sortedGenres.slice(0, 12));
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
      >
        <Icon name="settings" size={12} />
        <span>{t('library.filters')}</span>
        {#if filters.activeFilterCount > 0}
          <span class="filters-count">{filters.activeFilterCount}</span>
        {/if}
        <span class="filters-caret" class:flip={filters.filtersOpen}>
          <Icon name="chevron_down" size={11} />
        </span>
      </button>
    {/if}
    <div class="view-seg" role="group" aria-label="View mode">
      <button class="view-btn" class:active={filters.viewMode === 'grid'} onclick={() => filters.setView('grid')} use:tooltip={t('library.view.grid')} aria-label={t('library.view.grid')} data-test="view-grid">
        <Icon name="layout_grid" size={13} />
      </button>
      <button class="view-btn" class:active={filters.viewMode === 'compact'} onclick={() => filters.setView('compact')} use:tooltip={t('library.view.compact')} aria-label={t('library.view.compact')} data-test="view-compact">
        <Icon name="layout_compact" size={13} />
      </button>
      <button class="view-btn" class:active={filters.viewMode === 'list'} onclick={() => filters.setView('list')} use:tooltip={t('library.view.list')} aria-label={t('library.view.list')} data-test="view-list">
        <Icon name="layout_list" size={13} />
      </button>
    </div>
  </div>
  {#if !skeletonOnly && filters.filtersOpen}
    <div class="filters-panel" transition:slide={{ duration: 260, easing: cubicOut }}>
      <section class="filter-section">
        <h4 class="section-label">{t('series.status')}</h4>
        <div class="status-pills">
          {#each STATUS_FILTERS as f (f.id)}
            {@const count = filters.statusCount(f.id)}
            <button
              class="filter status-filter"
              class:active={filters.statusFilter === f.id}
              onclick={() => (filters.statusFilter = f.id)}
              data-test={`filter-status-${f.id}`}
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
        <h4 class="section-label">{t('library.filters.download')}</h4>
        <div class="status-pills">
          {#each DL_FILTERS as f (f.id)}
            {@const count = filters.dlCount(f.id)}
            <button
              class="filter status-filter"
              class:active={filters.dlFilter === f.id}
              onclick={() => (filters.dlFilter = f.id)}
              data-test={`filter-dl-${f.id}`}
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
        <h4 class="section-label">{t('library.filters.genre')}</h4>
        <div class="genre-pills">
          {#each visibleGenres as g (g.name)}
            {@const isFav = app.favGenres.includes(g.name)}
            {@const isSelected = app.selectedGenres.includes(g.name)}
            <div class="genre-pill" class:selected={isSelected} class:fav={isFav}>
              <button class="genre-name" onclick={() => toggleSelectedGenre(g.name)}>
                {g.name}
                <span class="genre-count">{g.count}</span>
              </button>
              <button
                class="fav-btn"
                class:on={isFav}
                onclick={() => toggleFavGenre(g.name)}
                use:tooltip={isFav ? t('genre.unfav') : t('genre.fav')}
                aria-label={isFav ? t('genre.unfav') : t('genre.fav')}
              >★</button>
            </div>
          {/each}
          {#if sortedGenres.length > 12}
            <button class="show-all" onclick={() => (showAllGenres = !showAllGenres)}>
              {showAllGenres ? t('genre.show_less') : t('genre.show_all').replace('{n}', String(sortedGenres.length - 12))}
            </button>
          {/if}
          {#if app.selectedGenres.length >= 2}
            <div class="combo-seg" use:tooltip={t('genre.combo.desc')}>
              <button
                class="combo-btn"
                class:active={app.genreCombo === 'or'}
                onclick={() => setGenreCombo('or')}
              >{t('genre.combo.or')}</button>
              <button
                class="combo-btn"
                class:active={app.genreCombo === 'and'}
                onclick={() => setGenreCombo('and')}
              >{t('genre.combo.and')}</button>
            </div>
          {/if}
          {#if app.selectedGenres.length > 0}
            <button class="clear-genres" onclick={clearSelectedGenres}>{t('genre.clear')}</button>
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

  .genre-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .genre-pill {
    display: inline-flex; align-items: stretch;
    border: 1px solid var(--border);
    border-radius: 9999px;
    background: rgba(255,255,255,0.03);
    overflow: hidden;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .genre-pill:hover { background: var(--surface2); }
  .genre-pill.selected {
    background: var(--accent-dim);
    border-color: var(--accent);
  }
  .genre-pill.fav { border-color: rgba(251, 191, 36, 0.45); }
  .genre-name {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 4px 4px 11px;
    font-size: 11px; font-weight: 500;
    color: var(--text2);
    background: transparent;
  }
  .genre-pill.selected .genre-name { color: var(--text); font-weight: 600; }
  .genre-count {
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
  .show-all, .clear-genres {
    padding: 4px 11px; border-radius: 9999px;
    border: 1px dashed var(--border);
    background: transparent; color: var(--text3);
    font-size: 11px; font-weight: 500;
    transition: color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .show-all:hover, .clear-genres:hover { color: var(--text); border-color: var(--accent); }
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

  .view-seg {
    display: inline-flex; gap: 2px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 2px;
  }
  .view-btn {
    width: 28px; height: 24px;
    display: grid; place-items: center;
    border-radius: 9999px;
    background: transparent; color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .view-btn:hover { color: var(--text); background: var(--hover-bg); }
  .view-btn.active { background: var(--accent); color: #fff; }
</style>
