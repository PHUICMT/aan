<script lang="ts">
  import { onDestroy, tick, untrack } from 'svelte';
  import Popover from '../../shared/components/ui/Popover.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import {
    addAnnotation,
    listAnnotationsForChapter,
    removeAnnotation,
    updateAnnotationColor,
    updateAnnotationNote,
    type Annotation,
  } from '../../shared/lib/api';
  import { rangeToOffsets, offsetsToRange, wrapRange } from './annotation-range';
  import { app } from '../../shared/lib/store.svelte';

  type Props = {
    bodyEl: HTMLElement | null;
    chapterId: string | undefined;
    pid: number | null;
    /** Bumped by NovelReader when chapter html lands; we re-render. */
    epoch: number;
  };
  let { bodyEl, chapterId, pid, epoch }: Props = $props();

  const COLORS = ['yellow', 'green', 'blue', 'pink', 'red'] as const;
  type Color = (typeof COLORS)[number];

  let items = $state<Annotation[]>([]);
  let menuOpen = $state(false);
  let menuPos = $state({ top: 0, left: 0 });
  let menuKind = $state<'create' | 'edit'>('create');
  // Captured at mousedown of the create flow so the menu has the offsets
  // even after the browser clears the selection (e.g. when we click).
  let pendingOffsets: { start: number; end: number; snippet: string } | null = null;
  let editingId = $state<number | null>(null);
  let editingNote = $state('');

  async function refreshList() {
    if (!chapterId) { items = []; return; }
    try {
      items = await listAnnotationsForChapter(chapterId);
    } catch {
      items = [];
    }
  }

  // Strip our highlight wrappers and re-add them from `items`. Cheaper
  // than diffing — the chapter is short and re-render is once per swap.
  function clearWrappers() {
    if (!bodyEl) return;
    const marks = bodyEl.querySelectorAll('span.nv-anno');
    marks.forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    bodyEl.normalize();
  }

  function applyAll() {
    if (!bodyEl) return;
    clearWrappers();
    // Re-apply in reverse-offset order so earlier wraps don't shift the
    // offsets of later ones (extractContents mutates the tree).
    const sorted = [...items].sort((a, b) => b.start_offset - a.start_offset);
    for (const a of sorted) {
      const r = offsetsToRange(bodyEl, a.start_offset, a.end_offset);
      if (!r) continue;
      try {
        wrapRange(r, `nv-anno nv-anno-${a.color}`, {
          annoId: String(a.id),
          annoColor: a.color,
        });
      } catch {}
    }
  }

  // Reload + re-apply whenever the chapter html or chapter id changes.
  $effect(() => {
    epoch; chapterId;
    void untrack(async () => {
      await refreshList();
      await tick();
      applyAll();
    });
  });

  function openCreateMenu() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    if (!bodyEl) return;
    const range = sel.getRangeAt(0);
    const offsets = rangeToOffsets(bodyEl, range);
    if (!offsets) return;
    const snippet = range.toString().trim();
    if (!snippet) return;
    const rect = range.getBoundingClientRect();
    pendingOffsets = { ...offsets, snippet };
    menuKind = 'create';
    editingId = null;
    menuPos = positionMenu(rect);
    menuOpen = true;
  }

  function openEditMenu(span: HTMLElement) {
    const id = Number(span.dataset.annoId);
    if (!id) return;
    const found = items.find((a) => a.id === id);
    if (!found) return;
    const rect = span.getBoundingClientRect();
    editingId = id;
    editingNote = found.note ?? '';
    menuKind = 'edit';
    menuPos = positionMenu(rect);
    menuOpen = true;
  }

  function positionMenu(rect: DOMRect): { top: number; left: number } {
    const vw = window.innerWidth;
    const w = 280;
    let left = Math.round(rect.left + rect.width / 2 - w / 2);
    if (left + w + 16 > vw) left = vw - w - 16;
    if (left < 16) left = 16;
    return { top: Math.round(rect.bottom + 8), left };
  }

  async function createWith(color: Color) {
    if (!pendingOffsets || !chapterId || pid == null) return;
    try {
      await addAnnotation({
        chapterId,
        pid,
        color,
        textSnippet: pendingOffsets.snippet,
        startOffset: pendingOffsets.start,
        endOffset: pendingOffsets.end,
      });
      window.getSelection()?.removeAllRanges();
      menuOpen = false;
      pendingOffsets = null;
      await refreshList();
      await tick();
      applyAll();
    } catch {}
  }

  async function changeColor(color: Color) {
    if (editingId == null) return;
    await updateAnnotationColor(editingId, color);
    await refreshList();
    await tick();
    applyAll();
  }

  async function saveNote() {
    if (editingId == null) return;
    await updateAnnotationNote(editingId, editingNote);
    await refreshList();
    menuOpen = false;
  }

  async function deleteCurrent() {
    if (editingId == null) return;
    await removeAnnotation(editingId);
    menuOpen = false;
    editingId = null;
    await refreshList();
    await tick();
    applyAll();
  }

  function onMouseUp(e: MouseEvent) {
    // Clicking inside the menu itself shouldn't re-trigger.
    const target = e.target as HTMLElement;
    if (target.closest('.nv-anno-menu')) return;
    // Double-click is the dictionary lookup gesture — let it pass through.
    if (e.detail >= 2) return;
    // If we clicked on an existing highlight, open the edit menu.
    const span = target.closest('span.nv-anno') as HTMLElement | null;
    if (span) {
      // Only treat as edit if no selection was made.
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        e.preventDefault();
        openEditMenu(span);
        return;
      }
    }
    // Otherwise, defer to selection-end logic. setTimeout lets the
    // browser finalize the selection before we read it.
    setTimeout(() => openCreateMenu(), 0);
  }

  // Highlight clicks open the edit menu — the Popover's outside-click
  // would otherwise close it immediately when we click the next highlight.
  // We don't need a doc-level mousedown handler since Popover handles
  // outside dismissal itself.

  // Wire the body listener once bodyEl is known.
  let attachedTo: HTMLElement | null = null;
  $effect(() => {
    if (attachedTo === bodyEl) return;
    if (attachedTo) attachedTo.removeEventListener('mouseup', onMouseUp);
    attachedTo = bodyEl;
    if (bodyEl) bodyEl.addEventListener('mouseup', onMouseUp);
  });
  onDestroy(() => {
    if (attachedTo) attachedTo.removeEventListener('mouseup', onMouseUp);
  });
</script>

<Popover
  open={menuOpen}
  at={menuPos}
  onClose={() => (menuOpen = false)}
  minWidth={280}
  testId="anno-menu"
>
  <div class="nv-anno-menu">
    <div class="row">
      {#each COLORS as c (c)}
        <button
          class="swatch swatch-{c}"
          onclick={() => (menuKind === 'create' ? createWith(c) : changeColor(c))}
          aria-label={c}
          use:tooltip={c}
          data-test="anno-color-{c}"
        ></button>
      {/each}
      {#if menuKind === 'edit'}
        <button class="del" onclick={deleteCurrent} use:tooltip={"Delete"} aria-label="Delete" data-test="anno-delete">×</button>
      {/if}
    </div>
    {#if menuKind === 'edit'}
      <textarea
        class="note"
        bind:value={editingNote}
        placeholder="Add a note…"
        rows="3"
        data-test="anno-note"
      ></textarea>
      <div class="row end">
        <button class="save" onclick={saveNote} data-test="anno-save-note">Save</button>
      </div>
    {/if}
  </div>
</Popover>

<style>
  .nv-anno-menu {
    display: flex; flex-direction: column; gap: 8px;
  }
  .row { display: inline-flex; align-items: center; gap: 6px; }
  .row.end { justify-content: flex-end; }
  .swatch {
    width: 26px; height: 26px; border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.18);
    transition: transform 0.12s var(--ease-out), box-shadow 0.12s var(--ease-out);
    cursor: pointer;
  }
  .swatch:hover { transform: scale(1.1); }
  .swatch-yellow { background: rgba(251, 191, 36, 0.75); }
  .swatch-green  { background: rgba(34, 197, 94, 0.65); }
  .swatch-blue   { background: rgba(96, 165, 250, 0.7); }
  .swatch-pink   { background: rgba(236, 72, 153, 0.7); }
  .swatch-red    { background: rgba(239, 68, 68, 0.7); }
  .del {
    margin-left: auto;
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(255,255,255,0.06); color: var(--text2);
    font-weight: 700;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .del:hover { background: rgba(239,68,68,0.32); color: #fff; }
  .note {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    font-size: 12px;
    resize: vertical;
    min-height: 60px;
    outline: none;
  }
  .note:focus { border-color: var(--accent); }
  .save {
    padding: 6px 14px; border-radius: 9999px;
    background: var(--accent); color: #fff;
    font-size: 12px; font-weight: 700;
    transition: background 0.12s var(--ease-out);
  }
  .save:hover { background: color-mix(in srgb, var(--accent) 80%, white); }

  :global(span.nv-anno) {
    border-radius: 2px;
    padding: 0 1px;
    cursor: pointer;
    transition: filter 0.12s var(--ease-out);
  }
  :global(span.nv-anno:hover) { filter: brightness(1.1); }
  :global(span.nv-anno-yellow) { background: rgba(251, 191, 36, 0.42); }
  :global(span.nv-anno-green)  { background: rgba(34, 197, 94, 0.32); }
  :global(span.nv-anno-blue)   { background: rgba(96, 165, 250, 0.38); }
  :global(span.nv-anno-pink)   { background: rgba(236, 72, 153, 0.38); }
  :global(span.nv-anno-red)    { background: rgba(239, 68, 68, 0.38); }
</style>
