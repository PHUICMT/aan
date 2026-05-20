<script lang="ts">
  import BackButton from '../../shared/components/BackButton.svelte';
  import MangaReader from '../reader/MangaReader.svelte';
  import NovelReader from '../reader/NovelReader.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { app } from '../../shared/lib/store.svelte';
  import { prefetchChapter } from '../../shared/lib/prefetch';

  const chapter = $derived(app.readerChapter);

  // Prefetch next downloaded chapter so Next has no disk-read pause.
  // Image-dir chapters are filtered inside prefetchChapter.
  $effect(() => {
    const c = chapter;
    if (!c) return;
    const list = app.readerChapters;
    const i = list.findIndex((x) => x.chapter_id === c.chapter_id);
    if (i < 0) return;
    // List sorted DESC by chapter_no — next in reading order = i-1.
    for (let j = i - 1; j >= 0; j--) {
      if (list[j].is_downloaded === 1) {
        prefetchChapter(list[j].chapter_id, list[j].pdf_path);
        break;
      }
    }
  });

  // Prefer in-memory lastPage to dodge the debounced DB-write race
  // when resuming via Continue pill right after leaving the reader.
  const initialPage = $derived.by(() => {
    if (!chapter) return 1;
    const lr = app.lastReader;
    if (lr && lr.chapterId === chapter.chapter_id && typeof lr.lastPage === 'number') {
      return Math.max(1, lr.lastPage);
    }
    return chapter.last_page_read ?? 1;
  });

  function pickReader(path: string): 'manga' | 'novel' | 'unsupported' {
    if (!path) return 'unsupported';
    const lower = path.toLowerCase();
    if (lower.endsWith('.txt') || lower.endsWith('.html') || lower.endsWith('.htm')) return 'novel';
    // .pdf or image-dir (e.g. data/manga/17043/ch_2) — MangaReader auto-detects.
    return 'manga';
  }

  const kind = $derived(chapter ? pickReader(chapter.pdf_path) : 'unsupported');

  // Overlays sit below toolbars so sliders stay legible while content tints.
  const dimOpacity = $derived(1 - app.readerBrightness);
  const warmOpacity = $derived(app.readerWarmth);
</script>

<div class="page" data-test="reader">
  <header class="topbar">
    <BackButton />
    {#if chapter}
      <div class="title-wrap">
        <div class="ch-no">{t('series.ch_no')} {chapter.chapter_no}</div>
        <div class="ch-title">{chapter.title || '—'}</div>
      </div>
    {/if}
  </header>

  <div class="body">
    {#if !chapter}
      <p class="hint">{t('reader.placeholder')}</p>
    {:else if kind === 'manga'}
      <!-- Force remount on chapter switch — MangaReader loads PDF in onMount,
           not in an $effect, so without {#key} pdfDoc/pageCount go stale. -->
      {#key chapter.chapter_id}
        <MangaReader
          pdfPath={chapter.pdf_path}
          chapterId={chapter.chapter_id}
          {initialPage}
        />
      {/key}
    {:else if kind === 'novel'}
      <NovelReader pdfPath={chapter.pdf_path} chapterId={chapter.chapter_id} />
    {:else}
      <p class="hint">Unsupported file type: {chapter.pdf_path}</p>
    {/if}
  </div>

  {#if dimOpacity > 0}
    <div class="reader-overlay dim" style:opacity={dimOpacity}></div>
  {/if}
  {#if warmOpacity > 0}
    <div class="reader-overlay warm" style:opacity={warmOpacity}></div>
  {/if}
</div>

<style>
  .page {
    height: 100%;
    display: flex; flex-direction: column;
    background: var(--reader-bg);
  }
  /* Follow MangaReader's data-reader-bg (overrides app theme). */
  :global(:root[data-reader-bg="light"]) .page { background: #f3f1ea; }
  :global(:root[data-reader-bg="dark"])  .page { background: #161826; }

  .topbar {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 32px;
    background: rgba(8, 14, 26, 0.75);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border-soft);
    color: #f9fafb;
    z-index: 5;
    transition: transform 0.22s var(--ease-out), opacity 0.22s var(--ease-out);
  }
  /* Immersive: hide topbar in sync with reader-bar. */
  :global(:root[data-reader-controls="hidden"]) .topbar {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }
  :global(:root[data-reader-bg="light"]) .topbar {
    background: rgba(255, 255, 255, 0.78);
    color: #1f2230;
    border-bottom-color: rgba(0,0,0,0.08);
  }
  :global(:root[data-reader-bg="light"]) .topbar :global(.ch-no) { color: #6d28d9; }
  .title-wrap {
    display: flex; flex-direction: column;
    min-width: 0;
  }
  .ch-no {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    color: var(--accent); text-transform: uppercase;
  }
  .ch-title {
    font-size: 13px; font-weight: 600;
    color: inherit; /* follow reader-bg, not app theme */
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .body {
    flex: 1;
    overflow-y: auto;
    scroll-behavior: auto;
    /* No scrollbar-gutter — keeps reader-bar flush with topbar; page
       padding compensates for the scrollbar. */
  }
  .hint {
    text-align: center; padding: 80px 20px;
    color: var(--text2); font-size: 13px;
  }
  /* z=9: below toolbar popovers (z>=20), above content. */
  .reader-overlay {
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 9;
    transition: opacity 0.15s var(--ease-out);
  }
  .reader-overlay.dim  { background: #000; }
  .reader-overlay.warm { background: #ffb14a; mix-blend-mode: multiply; }
</style>
