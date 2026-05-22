<script lang="ts">
  import Modal from '../../shared/components/ui/Modal.svelte';
  import Button from '../../shared/components/ui/Button.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import {
    listCollections, createCollection, deleteCollection,
    type Collection,
  } from '../../shared/lib/api';
  import type { LibraryFilters } from './composables/useLibraryFilters.svelte';

  type Props = { filters: LibraryFilters };
  let { filters }: Props = $props();

  let items = $state<Collection[]>([]);
  let loaded = $state(false);
  let saveOpen = $state(false);
  let saveName = $state('');
  let saving = $state(false);
  let savedFlash = $state<number | null>(null);

  async function refresh() {
    try { items = await listCollections(); } catch { items = []; }
    loaded = true;
  }

  function activeId(): number | null {
    for (const c of items) {
      if (filters.matchesSnapshot(c.filter_json)) return c.id;
    }
    return null;
  }

  refresh();

  async function openSave() {
    saveName = '';
    saveOpen = true;
  }
  async function commitSave() {
    const name = saveName.trim();
    if (!name) return;
    saving = true;
    try {
      const id = await createCollection(name, filters.serializeFilters());
      saveOpen = false;
      savedFlash = id;
      setTimeout(() => (savedFlash = null), 1400);
      await refresh();
    } finally {
      saving = false;
    }
  }

  function applyChip(c: Collection) {
    filters.applyFilters(c.filter_json);
  }

  async function removeChip(id: number, e: MouseEvent) {
    e.stopPropagation();
    await deleteCollection(id);
    await refresh();
  }

  // Esc closes the save popover.
  function onKey(e: KeyboardEvent) {
    if (saveOpen && e.key === 'Escape') {
      saveOpen = false;
    } else if (saveOpen && e.key === 'Enter') {
      void commitSave();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="cc-row" data-test="collection-chips">
  {#each items as c (c.id)}
    {@const active = activeId() === c.id}
    {@const flash = savedFlash === c.id}
    <button
      type="button"
      class="cc-chip"
      class:active
      class:flash
      onclick={() => applyChip(c)}
      data-test="collection-chip"
      data-collection-id={c.id}
      use:tooltip={c.name}
    >
      <span class="cc-label">{c.name}</span>
      <span
        class="cc-x"
        role="button"
        tabindex="-1"
        aria-label="Delete {c.name}"
        onclick={(e) => removeChip(c.id, e)}
        onkeydown={(e) => { if (e.key === 'Enter') removeChip(c.id, e as unknown as MouseEvent); }}
        data-test="collection-chip-delete"
      >
        <Icon name="x" size={9} />
      </span>
    </button>
  {/each}
  {#if filters.activeFilterCount > 0 || filters.typeFilter !== 'all' || filters.sortKey !== 'updated'}
    <button
      type="button"
      class="cc-save"
      onclick={openSave}
      use:tooltip={t('library.collections.save_tooltip')}
      data-test="collection-save"
    >
      <Icon name="bookmark_plus" size={11} />
      <span>{t('library.collections.save')}</span>
    </button>
  {/if}
</div>

<Modal
  open={saveOpen}
  onClose={() => (saveOpen = false)}
  title={t('library.collections.save_title')}
  size="sm"
  testId="collection-save-modal"
>
  <p class="hint">{t('library.collections.save_hint')}</p>
  <!-- svelte-ignore a11y_autofocus — modal is opened by deliberate user action, autofocus is the expected UX -->
  <input
    type="text"
    class="cc-input"
    bind:value={saveName}
    placeholder={t('library.collections.name_placeholder')}
    autofocus
    data-test="collection-save-input"
  />
  {#snippet footer()}
    <div class="cc-actions">
      <Button variant="ghost" onclick={() => (saveOpen = false)}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={saving} disabled={!saveName.trim()} onclick={commitSave} testId="collection-save-confirm">
        {t('library.collections.save_confirm')}
      </Button>
    </div>
  {/snippet}
</Modal>

<style>
  .cc-row {
    display: flex; flex-wrap: wrap; gap: 6px;
    align-items: center;
    margin: 8px 0 4px;
  }
  .cc-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 4px 5px 12px;
    border-radius: 9999px;
    background: rgba(127,127,127,0.08);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 11px; font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s var(--ease-out),
      color 0.15s var(--ease-out),
      border-color 0.15s var(--ease-out),
      transform 0.15s var(--ease-out);
  }
  .cc-chip:hover { color: var(--text); border-color: var(--accent); transform: translateY(-1px); }
  .cc-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .cc-chip.flash {
    animation: cc-flash 1.2s var(--ease-out);
  }
  @keyframes cc-flash {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 80%, transparent); }
    100% { box-shadow: 0 0 0 14px transparent; }
  }
  .cc-label { line-height: 1; }
  .cc-x {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px;
    border-radius: 9999px;
    color: var(--text3);
    opacity: 0.6;
    transition: opacity 0.12s var(--ease-out), background 0.12s var(--ease-out), color 0.12s var(--ease-out);
    cursor: pointer;
  }
  .cc-chip:hover .cc-x { opacity: 1; }
  .cc-x:hover { background: rgba(239,68,68,0.32); color: #fff; }
  .cc-chip.active .cc-x { color: rgba(255,255,255,0.7); }
  .cc-chip.active .cc-x:hover { background: rgba(0,0,0,0.28); color: #fff; }

  .cc-save {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px;
    border-radius: 9999px;
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px dashed color-mix(in srgb, var(--accent) 40%, transparent);
    font-size: 11px; font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s var(--ease-out),
      color 0.15s var(--ease-out),
      border-style 0.15s var(--ease-out),
      transform 0.15s var(--ease-out);
  }
  .cc-save:hover {
    background: var(--accent); color: #fff; border-style: solid;
    transform: translateY(-1px);
  }

  .hint { margin: 0 0 14px; font-size: 12px; color: var(--text2); line-height: 1.5; }
  .cc-input {
    width: 100%; padding: 9px 12px;
    background: rgba(127,127,127,0.08);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s var(--ease-out);
  }
  .cc-input:focus { border-color: var(--accent); }
  .cc-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
