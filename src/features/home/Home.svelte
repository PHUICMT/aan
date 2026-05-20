<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../shared/components/Icon.svelte';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import {
    listRecentReads,
    listFavoriteSeries,
    listRecentlyAdded,
    readingStats,
    listChapters,
    listAbandoned,
    listLocalSeries,
  } from '../../shared/lib/api';
  import { getCoverUrl } from '../../shared/lib/covers';
  import { t } from '../../shared/lib/i18n.svelte';
  import { openSeries, openReader, setReaderChapters } from '../../shared/lib/store.svelte';
  import StatsBoard from './StatsBoard.svelte';
  import HomeHero from './HomeHero.svelte';
  import QuickChips from './QuickChips.svelte';
  import CardRow from './CardRow.svelte';
  import ContinueRow from './ContinueRow.svelte';
  import RandomPickModal from './RandomPickModal.svelte';
  import type {
    RecentRead,
    SeriesCard,
    ReadingStats,
  } from '../../shared/lib/types';

  //───── State ─────
  const RECENT_LIMIT = 7;       // 1 hero + 6 in row
  const FAV_PREVIEW = 6;
  const ADDED_LIMIT = 6;

  let recent = $state<RecentRead[]>([]);
  let favorites = $state<SeriesCard[]>([]);
  let recentlyAdded = $state<SeriesCard[]>([]);
  let abandoned = $state<SeriesCard[]>([]);
  let reading = $state<ReadingStats | null>(null);
  let loading = $state(true);
  let covers = $state<Record<number, string>>({});

  //───── Load ─────
  onMount(async () => {
    try {
      const [r, f, rs, ra, ab] = await Promise.all([
        listRecentReads(RECENT_LIMIT),
        listFavoriteSeries(),
        readingStats(365),
        listRecentlyAdded(ADDED_LIMIT),
        listAbandoned(30, 6),
      ]);
      const seen = new Set<number>();
      recent = r.filter((x) => {
        if (seen.has(x.pid)) return false;
        seen.add(x.pid);
        return true;
      });
      favorites = f.slice(0, FAV_PREVIEW);
      reading = rs;
      recentlyAdded = ra;
      abandoned = ab;

      const pids = new Set<number>();
      for (const x of r) pids.add(x.pid);
      for (const x of [...f, ...ra, ...ab]) pids.add(x.pid);
      for (const pid of pids) {
        void getCoverUrl(pid).then((url) => { if (url) covers[pid] = url; });
      }
    } finally {
      loading = false;
    }
  });

  //───── Resume / random pick ─────
  async function resumeRecent(item: RecentRead) {
    try {
      const chs = await listChapters(item.pid);
      setReaderChapters(chs);
      const c = chs.find((x) => x.chapter_id === item.chapter_id);
      if (c) openReader(c);
    } catch {
      openSeries(item.pid);
    }
  }

  let randomBusy = $state(false);
  let allSeriesCache = $state<SeriesCard[]>([]);
  let pickedSeries = $state<SeriesCard | null>(null);

  async function pickRandom() {
    if (randomBusy) return;
    randomBusy = true;
    try {
      if (allSeriesCache.length === 0) {
        allSeriesCache = await listLocalSeries();
      }
      if (allSeriesCache.length === 0) return;
      pickedSeries = allSeriesCache[Math.floor(Math.random() * allSeriesCache.length)];
      if (pickedSeries && !covers[pickedSeries.pid]) {
        const url = await getCoverUrl(pickedSeries.pid);
        if (url) covers[pickedSeries.pid] = url;
      }
    } finally {
      randomBusy = false;
    }
  }

  function rerollPicked() {
    if (allSeriesCache.length <= 1 || !pickedSeries) return;
    const current = pickedSeries.pid;
    let next = pickedSeries;
    // 8-try cap so tiny libraries don't loop forever.
    for (let i = 0; i < 8; i++) {
      const candidate = allSeriesCache[Math.floor(Math.random() * allSeriesCache.length)];
      if (candidate.pid !== current) { next = candidate; break; }
    }
    pickedSeries = next;
    if (pickedSeries && !covers[pickedSeries.pid]) {
      void getCoverUrl(pickedSeries.pid).then((url) => {
        if (url && pickedSeries) covers[pickedSeries.pid] = url;
      });
    }
  }

  function openPicked() {
    if (pickedSeries) openSeries(pickedSeries.pid);
    pickedSeries = null;
  }

  function cancelPick() { pickedSeries = null; }

  const hero = $derived<RecentRead | null>(recent[0] ?? null);
  const restRecent = $derived<RecentRead[]>(recent.slice(1));
</script>

<div class="page">
  <header class="hero-head">
    <div>
      <h1>{t('home.title')}</h1>
      <p class="sub">{t('home.sub')}</p>
    </div>
  </header>

  {#if loading}
    <div class="phase" out:fade={{ duration: 160, easing: cubicOut }}>
      <div class="skel-hero"><Shimmer radius={16} height="100%" /></div>
      <div class="skel-chips">
        {#each Array(5) as _, i (i)}
          <div class="skel-chip"><Shimmer radius={9999} height="100%" /></div>
        {/each}
      </div>
      <div class="skel-stats">
        {#each Array(3) as _, i (i)}
          <div class="skel-stat"><Shimmer radius={14} height="100%" /></div>
        {/each}
      </div>
      <div class="skel-heatmap"><Shimmer radius={14} height="100%" /></div>
    </div>
  {:else}
    <div class="phase" in:fade={{ duration: 240, delay: 120, easing: cubicOut }}>
      {#if hero}
        <HomeHero
          hero={hero}
          coverUrl={covers[hero.pid]}
          onResume={() => resumeRecent(hero)}
        />
      {/if}

      <QuickChips onPickRandom={pickRandom} {randomBusy} />

      {#if reading && reading.total_read > 0}
        <StatsBoard stats={reading} />
      {/if}

      {#if restRecent.length > 0}
        <ContinueRow items={restRecent} {covers} onResume={resumeRecent} />
      {/if}

      {#if favorites.length > 0}
        <CardRow
          title={t('home.favorites')}
          items={favorites}
          {covers}
          onClick={(s) => openSeries(s.pid)}
          seeAllHref="favorites"
        />
      {/if}

      {#if abandoned.length > 0}
        <CardRow
          title={t('home.abandoned')}
          items={abandoned}
          {covers}
          onClick={(s) => openSeries(s.pid)}
          seeAllHint={t('home.abandoned.hint')}
          dimmed
        />
      {/if}

      {#if recentlyAdded.length > 0}
        <CardRow
          title={t('home.recently_added')}
          items={recentlyAdded}
          {covers}
          onClick={(s) => openSeries(s.pid)}
          seeAllHref="library"
        />
      {/if}

      {#if !hero && favorites.length === 0}
        <div class="empty">
          <Icon name="book" size={28} />
          <p>{t('home.empty')}</p>
          <p class="hint">{t('home.empty.hint')}</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if pickedSeries}
  <RandomPickModal
    picked={pickedSeries}
    {covers}
    canReroll={allSeriesCache.length > 1}
    onReroll={rerollPicked}
    onOpen={openPicked}
    onCancel={cancelPick}
  />
{/if}

<style>
  .page { padding: 28px 40px 40px; height: 100%; overflow-y: auto; }

  .hero-head { margin-bottom: 20px; }
  .hero-head h1 {
    font-size: 28px; font-weight: 700; letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }
  .sub { font-size: 12px; color: var(--text2); }

  .skel-hero { height: 188px; border-radius: 18px; overflow: hidden; margin-bottom: 18px; }
  .skel-chips { display: flex; gap: 8px; margin-bottom: 20px; }
  .skel-chip { width: 110px; height: 30px; border-radius: 9999px; overflow: hidden; }
  .skel-stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 14px;
  }
  .skel-stat { height: 68px; border-radius: 14px; overflow: hidden; }
  .skel-heatmap { height: 180px; border-radius: 14px; overflow: hidden; margin-bottom: 24px; }

  .empty {
    padding: 60px 20px; text-align: center;
    color: var(--text2); font-size: 13px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .empty .hint { color: var(--text3); font-size: 11px; }
</style>
