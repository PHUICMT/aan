<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import { openReader, bumpSeriesMutation } from '../../shared/lib/store.svelte';
  import {
    convertChapterToPdf,
    convertChapterToImages,
    updateChapter,
    deleteChapter,
  } from '../../shared/lib/api';
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
  let editing = $state(false);
  let editTitle = $state(chapter.title ?? '');
  let editChapterNo = $state<number>(chapter.chapter_no);
  let savingEdit = $state(false);
  let confirmingDelete = $state(false);
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;

  function startEdit() {
    editTitle = chapter.title ?? '';
    editChapterNo = chapter.chapter_no;
    editing = true;
  }
  function cancelEdit() { editing = false; }
  async function saveEdit() {
    if (savingEdit) return;
    savingEdit = true;
    try {
      await updateChapter(chapter.chapter_id, {
        title: editTitle,
        chapterNo: editChapterNo,
      });
      chapter = { ...chapter, title: editTitle, chapter_no: editChapterNo };
      editing = false;
    } catch (e) {
      console.warn('chapter update failed', e);
    } finally {
      savingEdit = false;
    }
  }

  function askDelete() {
    confirmingDelete = true;
    if (deleteTimer) clearTimeout(deleteTimer);
    deleteTimer = setTimeout(() => (confirmingDelete = false), 4000);
  }
  async function doDelete() {
    confirmingDelete = false;
    if (deleteTimer) clearTimeout(deleteTimer);
    try {
      await deleteChapter(chapter.chapter_id);
      bumpSeriesMutation();
    } catch (e) {
      console.warn('chapter delete failed', e);
    }
  }

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
  <div class="no">
    {#if editing}
      <input
        class="inline-input small"
        type="number"
        step="0.1"
        bind:value={editChapterNo}
        onkeydown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
      />
    {:else}
      {t('series.ch_no')} {chapter.chapter_no}
    {/if}
  </div>
  <div class="title">
    {#if editing}
      <input
        class="inline-input"
        bind:value={editTitle}
        placeholder={t('series.edit.chapter_title') ?? 'Title'}
        onkeydown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
      />
    {:else}
      <span class="title-text">{chapter.title || '—'}</span>
    {/if}
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
    {#if editing}
      <button class="confirm-yes" disabled={savingEdit} onclick={saveEdit}>
        <Icon name="check" size={11} />
        {t('series.edit.save')}
      </button>
      <button class="confirm-no" onclick={cancelEdit} aria-label={t('common.cancel')}>
        <Icon name="x" size={10} />
      </button>
    {:else if confirmingDelete}
      <button class="confirm-yes danger" onclick={doDelete} data-test={`chapter-delete-confirm-${chapter.chapter_id}`}>
        <Icon name="trash" size={11} />
        {t('series.edit.delete_now')}
      </button>
      <button class="confirm-no" onclick={() => (confirmingDelete = false)} aria-label={t('common.cancel')}>
        <Icon name="x" size={10} />
      </button>
    {:else if !selectMode}
      <button
        class="redl"
        onclick={startEdit}
        use:tooltip={t('series.edit.chapter')}
        aria-label={t('series.edit.chapter')}
        data-test={`chapter-edit-${chapter.chapter_id}`}
      >
        <Icon name="pencil" size={11} />
      </button>
      <button
        class="redl danger"
        onclick={askDelete}
        use:tooltip={t('series.edit.delete')}
        aria-label={t('series.edit.delete')}
        data-test={`chapter-delete-${chapter.chapter_id}`}
      >
        <Icon name="trash" size={11} />
      </button>
    {/if}
    {#if isLocal && !editing && !confirmingDelete}
      <button class="read" onclick={() => openReader(chapter)} data-test={`chapter-read-${chapter.chapter_id}`}>
        <Icon name="book" size={12} />
        {t('series.read')}
      </button>
      {#if isPdf || isImageDir}
        {#if confirming}
          <span class="confirm-wrap">
            <button class="confirm-yes" disabled={converting} onclick={doConvert} data-test={`chapter-convert-confirm-${chapter.chapter_id}`}>
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
            data-test={`chapter-convert-${chapter.chapter_id}`}
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
  .confirm-yes.danger { background: #ef4444; }
  .inline-input {
    background: rgba(255,255,255,0.06);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    width: 100%;
    font-family: inherit;
  }
  .inline-input.small { width: 70px; }
  .inline-input:focus { outline: none; border-color: var(--accent); }
  .redl.danger:hover { background: #ef4444; color: #fff; }
</style>
