<script lang="ts">
  import { onMount } from 'svelte';
  import TitleBar from './app/TitleBar.svelte';
  import Sidebar from './app/Sidebar.svelte';
  import Library from './features/library/Library.svelte';
  import Settings from './features/settings/Settings.svelte';
  import SeriesDetail from './features/series/SeriesDetail.svelte';
  import Reader from './features/reader/Reader.svelte';
  import History from './features/history/History.svelte';
  import Favorites from './features/favorites/Favorites.svelte';
  import Home from './features/home/Home.svelte';
  import ReadingList from './features/reading-list/ReadingList.svelte';
  import KeyboardShortcuts from './shared/components/KeyboardShortcuts.svelte';
  import ContinuePill from './features/home/ContinuePill.svelte';
  import MoveJobBanner from './features/settings/MoveJobBanner.svelte';
  import { app, toggleShortcuts, closeShortcuts, resumeLastReader, seedLastReader } from './shared/lib/store.svelte';
  import { setCloseToTray } from './shared/lib/api';
  import { pageSlide } from './shared/lib/transitions';

  onMount(() => {
    document.documentElement.dataset.theme = app.theme;
    void seedLastReader();
    void setCloseToTray(app.closeToTray);
  });
  $effect(() => {
    document.documentElement.dataset.theme = app.theme;
  });
  $effect(() => {
    void setCloseToTray(app.closeToTray);
  });

  function onKey(e: KeyboardEvent) {
    const tgt = e.target as HTMLElement | null;
    const inField = !!tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);
    if (e.key === '?' && !inField) {
      e.preventDefault();
      toggleShortcuts();
      return;
    }
    if (e.key === 'Escape' && app.shortcutsOpen) {
      e.preventDefault();
      closeShortcuts();
      return;
    }
    if ((e.key === 'r' || e.key === 'R') && !inField && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (app.page !== 'reader' && app.lastReader) {
        e.preventDefault();
        void resumeLastReader();
      }
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<KeyboardShortcuts open={app.shortcutsOpen} onClose={closeShortcuts} />
<ContinuePill />
<MoveJobBanner />

<div class="root">
  <TitleBar />
  <div class="body">
    <Sidebar />
    <main class="content">
      {#key app.page}
        <div
          class="page-wrap"
          in:pageSlide={{ mode: 'in' }}
          out:pageSlide={{ mode: 'out' }}
        >
          {#if app.page === 'library'}
            <Library />
          {:else if app.page === 'settings'}
            <Settings />
          {:else if app.page === 'series'}
            <SeriesDetail />
          {:else if app.page === 'reader'}
            <Reader />
          {:else if app.page === 'history'}
            <History />
          {:else if app.page === 'favorites'}
            <Favorites />
          {:else if app.page === 'home'}
            <Home />
          {:else if app.page === 'list'}
            <ReadingList />
          {/if}
        </div>
      {/key}
    </main>
  </div>
</div>

<style>
  .root {
    height: 100%;
    display: flex; flex-direction: column;
    background:
      radial-gradient(1200px 600px at -10% -20%, var(--accent-dim), transparent 70%),
      radial-gradient(900px 500px at 110% 110%, var(--accent-dim), transparent 70%),
      linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%);
  }
  .body { flex: 1; display: flex; min-height: 0; }
  .content { flex: 1; min-width: 0; overflow: hidden; position: relative; }
  .page-wrap {
    position: absolute; inset: 0;
    will-change: transform, opacity;
  }
</style>
