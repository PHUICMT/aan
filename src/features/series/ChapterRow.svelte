<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import { openReader } from '../../shared/lib/store.svelte';
  import { convertChapterToPdf, convertChapterToImages } from '../../shared/lib/api';
  import type { Chapter } from '../../shared/lib/types';

  type Props = {
    chapter: Chapter;
    seriesName: string;
    kind: string;
    isContinue?: boolean;
    selectMode?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
  };
  let {
    chapter = $bindable(),
    isContinue = false,
    selectMode = false,
    selected = false,
    onToggleSelect,
  }: Props = $props();

  const isLocal = $derived(chapter.is_downloaded === 1);
  const isPdf = $derived(isLocal && chapter.pdf_path.toLowerCase().endsWith('.pdf'));
  const isImageDir = $derived(isLocal && !chapter.pdf_path.toLowerCase().endsWith('.pdf') && !chapter.pdf_path.toLowerCase().endsWith('.html'));
  const isNovelHtml = $derived(isLocal && chapter.pdf_path.toLowerCase().endsWith('.html'));
  const readPct = $derived(
    isLocal && chapter.page_count > 0 && (chapter.last_page_read ?? 0) > 0
      ? Math.min(100, Math.round(((chapter.last_page_read ?? 0) / chapter.page_count) * 100))
      : 0,
  );
  const isFullyRead = $derived(
    isLocal && chapter.page_count > 0 && (chapter.last_page_read ?? 0) >= chapter.page_count,
  );
  const isInProgress = $derived(readPct > 0 && !isFullyRead);

  let converting = $state(false);
  let confirming = $state(false);
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;

  function askConvert() {
    if (converting) return;
    confirming = true;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => (confirming = false), 4000);
  }
  function cancelConvert() {
    confirming = false;
    if (confirmTimer) clearTimeout(confirmTimer);
  }
  async function doConvert() {
    confirming = false;
    if (confirmTimer) clearTimeout(confirmTimer);
    converting = true;
    try {
      if (isPdf) {
        const next = await convertChapterToImages(chapter.chapter_id);
        chapter = { ...chapter, pdf_path: next };
      } else if (isImageDir) {
        const next = await convertChapterToPdf(chapter.chapter_id);
        chapter = { ...chapter, pdf_path: next };
      }
    } catch (e) {
      console.warn('convert failed', e);
    } finally {
      converting = false;
    }
  }
  const dateText = $derived(
    chapter.release_date ? chapter.release_date.split(' ')[0] : ''
  );
</script>

<div
  class="row"
  class:local={isLocal}
  class:continue={isContinue}
  class:select-mode={selectMode}
  class:selected
  data-test={`chapter-row-${chapter.chapter_id}`}
>
  {#if isInProgress}
    <div class="read-strip">
      <div class="read-strip-fill" style:width="{readPct}%"></div>
    </div>
  {/if}
  {#if selectMode}
    <button
      class="sel-box"
      class:on={selected}
      onclick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
      aria-pressed={selected}
      aria-label={selected ? 'Deselect chapter' : 'Select chapter'}
    >
      {#if selected}<Icon name="check" size={11} />{/if}
    </button>
  {/if}
  <div class="no">{t('series.ch_no')} {chapter.chapter_no}</div>
  <div class="title">
    <span class="title-text">{chapter.title || '—'}</span>
    {#if isPdf}
      <span class="fmt-chip pdf" use:tooltip={t('chapter.fmt.pdf')}>PDF</span>
    {:else if isImageDir}
      <span class="fmt-chip img" use:tooltip={t('chapter.fmt.images')}>IMG</span>
    {:else if isNovelHtml}
      <span class="fmt-chip html" use:tooltip={t('chapter.fmt.html')}>HTML</span>
    {/if}
    {#if isFullyRead}
      <span class="read-chip" use:tooltip={t('chapter.fully_read')}>
        <Icon name="check" size={9} />
      </span>
    {:else if isInProgress}
      <span class="read-chip in-progress">
        {chapter.last_page_read}/{chapter.page_count}
      </span>
    {/if}
  </div>
  <div class="date">{dateText}</div>
  <div class="actions">
    {#if isLocal}
      <button class="read" onclick={() => openReader(chapter)} data-test={`chapter-read-${chapter.chapter_id}`}>
        <Icon name="book" size={12} />
        {t('series.read')}
      </button>
      {#if isPdf || isImageDir}
        {#if confirming}
          <span class="confirm-wrap">
            <button class="confirm-yes" disabled={converting} onclick={doConvert}>
              <Icon name="check" size={11} />
              {isPdf ? t('chapter.to_images') : t('chapter.to_pdf')}?
            </button>
            <button class="confirm-no" onclick={cancelConvert} aria-label={t('common.cancel')}>
              <Icon name="x" size={10} />
            </button>
          </span>
        {:else}
          <button
            class="redl"
            disabled={converting}
            onclick={askConvert}
            use:tooltip={isPdf ? t('chapter.to_images') : t('chapter.to_pdf')}
            aria-label={isPdf ? t('chapter.to_images') : t('chapter.to_pdf')}
          >
            <Icon name={isPdf ? 'folder_open' : 'file_text'} size={11} />
          </button>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
  .row {
    position: relative;
    display: grid;
    grid-template-columns: 90px 1fr auto auto;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-soft);
    transition: background 0.15s var(--ease-out), grid-template-columns 0.2s var(--ease-out);
  }
  .row.select-mode {
    grid-template-columns: 28px 90px 1fr auto auto;
  }
  .row.selected {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .sel-box {
    width: 20px; height: 20px;
    display: grid; place-items: center;
    border-radius: 5px;
    border: 1.5px solid var(--border);
    background: transparent;
    color: #fff;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .sel-box:hover { border-color: var(--accent); }
  .sel-box.on {
    background: var(--accent);
    border-color: var(--accent);
  }
  .read-strip {
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 1px;
    transform: scaleY(0.5);
    transform-origin: bottom;
    z-index: 1;
    pointer-events: none;
    background: transparent;
  }
  .read-strip-fill {
    height: 100%;
    background: #4ade80;
    opacity: 0.7;
  }
  .read-chip {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 1px 6px; border-radius: 9999px;
    background: rgba(74, 222, 128, 0.16);
    color: #4ade80;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .read-chip.in-progress {
    background: rgba(124, 58, 237, 0.16);
    color: #c4b5fd;
    font-family: var(--font-mono);
  }
  .row:hover { background: rgba(255,255,255,0.03); }
  .row.continue {
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.12), transparent 60%);
    box-shadow: inset 3px 0 0 var(--accent);
  }
  .row.continue:hover { background: linear-gradient(90deg, rgba(139, 92, 246, 0.18), rgba(255,255,255,0.02)); }
  .no { font-size: 11px; font-weight: 700; color: var(--text2); }
  .row.local .no { color: var(--accent); }
  .title {
    display: inline-flex; align-items: center; gap: 8px;
    min-width: 0;
    font-size: 12px; color: var(--text);
  }
  .title-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row:not(.local) .title-text { color: var(--text3); }
  .fmt-chip {
    display: inline-block;
    padding: 1px 6px; border-radius: 4px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
    flex-shrink: 0;
  }
  .fmt-chip.pdf  { background: var(--fmt-pdf-bg);  color: var(--fmt-pdf-fg); }
  .fmt-chip.img  { background: var(--fmt-img-bg);  color: var(--fmt-img-fg); }
  .fmt-chip.html { background: var(--fmt-html-bg); color: var(--fmt-html-fg); }
  .date { font-size: 10px; color: var(--text3); font-family: var(--font-mono); }
  .actions { display: inline-flex; align-items: center; gap: 6px; }
  .read {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 9999px;
    background: var(--accent-dim);
    color: var(--sidebar-hi);
    font-size: 11px; font-weight: 600;
    transition:
      background 0.15s var(--ease-out),
      transform 0.12s var(--ease-out);
  }
  .read:hover { background: var(--accent); color: #fff; }
  .read:active { transform: scale(0.96); }
  .redl {
    width: 22px; height: 22px; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.04); color: var(--text2);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .redl:hover { background: var(--warning); color: #111; }
  .confirm-wrap {
    display: inline-flex; align-items: center; gap: 4px;
    animation: fade-in-up 0.18s var(--ease-out);
  }
  .confirm-yes {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 9999px;
    background: var(--accent); color: #fff;
    font-size: 10px; font-weight: 600;
    transition: filter 0.15s var(--ease-out);
  }
  .confirm-yes:hover:not(:disabled) { filter: brightness(1.1); }
  .confirm-yes:disabled { opacity: 0.6; cursor: progress; }
  .confirm-no {
    width: 20px; height: 20px; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.06); color: var(--text2);
    transition: background 0.15s var(--ease-out);
  }
  .confirm-no:hover { background: rgba(255,255,255,0.14); color: var(--text); }
</style>
