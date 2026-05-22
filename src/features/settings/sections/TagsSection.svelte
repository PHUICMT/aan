<script lang="ts">
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import IconButton from '../../../shared/components/ui/IconButton.svelte';
  import Button from '../../../shared/components/ui/Button.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { tooltip } from '../../../shared/lib/tooltip';
  import { listTags, renameTag, deleteTag, mergeTags } from '../../../shared/lib/api';
  import type { TagCount } from '../../../shared/lib/types';
  import { bumpSeriesMutation } from '../../../shared/lib/store.svelte';

  type Props = {
    open: boolean;
    searching: boolean;
    query: string;
    onToggle: () => void;
  };
  let { open, searching, onToggle }: Props = $props();

  let tags = $state<TagCount[]>([]);
  let loading = $state(false);
  let busy = $state(false);
  let err = $state<string | null>(null);

  let q = $state('');
  let selectMode = $state(false);
  let selected = $state<Set<string>>(new Set());
  let mergeTarget = $state('');

  let editing = $state<string | null>(null);
  let draft = $state('');
  let confirmDelete = $state<string | null>(null);

  async function refresh() {
    loading = true;
    try { tags = await listTags(); err = null; }
    catch (e) { err = String(e); }
    finally { loading = false; }
  }

  // Sort by count desc, then name asc — keeps heavy-use tags up top.
  const sortedTags = $derived.by(() => {
    const filt = q.trim()
      ? tags.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()))
      : tags;
    return [...filt].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  function startEdit(name: string) {
    editing = name;
    draft = name;
  }
  function cancelEdit() { editing = null; draft = ''; }
  async function saveEdit() {
    if (!editing) return;
    const from = editing;
    const to = draft.trim();
    if (!to || to === from) { cancelEdit(); return; }
    busy = true;
    try {
      await renameTag(from, to);
      bumpSeriesMutation();
      cancelEdit();
      await refresh();
    } catch (e) { err = String(e); }
    finally { busy = false; }
  }

  async function doDelete(name: string) {
    busy = true;
    try {
      await deleteTag(name);
      bumpSeriesMutation();
      confirmDelete = null;
      await refresh();
    } catch (e) { err = String(e); }
    finally { busy = false; }
  }

  function toggleSelect(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    selected = next;
  }
  function exitSelectMode() {
    selectMode = false;
    selected = new Set();
    mergeTarget = '';
  }
  async function doMerge() {
    const target = mergeTarget.trim();
    if (!target || selected.size === 0) return;
    busy = true;
    try {
      await mergeTags([...selected].filter((s) => s !== target), target);
      bumpSeriesMutation();
      exitSelectMode();
      await refresh();
    } catch (e) { err = String(e); }
    finally { busy = false; }
  }

  onMount(() => { void refresh(); });
</script>

<section class="group" class:open data-test="settings-section-tags">
  <button class="group-head" onclick={onToggle} disabled={searching}>
    <span class="sec-icon"><Icon name="tag" size={14} /></span>
    <h2>{t('settings.section.tags')}</h2>
    <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
  </button>
  {#if open}
    <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
      <p class="desc">{t('settings.tags.desc')}</p>

      {#if err}
        <p class="err" transition:fade={{ duration: 140 }}>{err}</p>
      {/if}

      <div class="toolbar">
        <div class="search">
          <Icon name="search" size={12} />
          <input
            type="text"
            placeholder={t('settings.tags.search')}
            bind:value={q}
            data-test="tags-search"
          />
        </div>
        {#if !selectMode}
          <Button variant="ghost" icon="check" disabled={tags.length < 2} onclick={() => (selectMode = true)} testId="tags-select-mode">
            {t('settings.tags.merge_mode')}
          </Button>
        {:else}
          <Button variant="ghost" onclick={exitSelectMode} testId="tags-select-cancel">
            {t('common.cancel')}
          </Button>
        {/if}
      </div>

      {#if selectMode}
        <div class="merge-bar" transition:slide={{ duration: 180, easing: cubicOut }}>
          <span class="merge-count">{selected.size} {t('settings.tags.selected')}</span>
          <input
            class="merge-target"
            type="text"
            placeholder={t('settings.tags.merge_target')}
            bind:value={mergeTarget}
            data-test="tags-merge-target"
          />
          <Button
            variant="primary"
            loading={busy}
            disabled={!mergeTarget.trim() || selected.size === 0}
            onclick={doMerge}
            testId="tags-merge-go"
          >{t('settings.tags.merge')}</Button>
        </div>
      {/if}

      {#if loading && tags.length === 0}
        <p class="empty">{t('common.loading')}</p>
      {:else if sortedTags.length === 0}
        <p class="empty">{q.trim() ? t('settings.tags.no_match') : t('settings.tags.empty')}</p>
      {:else}
        <ul class="list">
          {#each sortedTags as tg (tg.name)}
            <li class:editing={editing === tg.name} class:selected={selected.has(tg.name)} data-test="tag-row">
              {#if selectMode}
                <button
                  type="button"
                  class="sel-mark"
                  class:on={selected.has(tg.name)}
                  onclick={() => toggleSelect(tg.name)}
                  aria-label={selected.has(tg.name) ? t('common.cancel') : t('common.close')}
                >
                  {#if selected.has(tg.name)}<Icon name="check" size={10} />{/if}
                </button>
              {/if}

              {#if editing === tg.name}
                <input
                  class="edit-input"
                  type="text"
                  bind:value={draft}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void saveEdit(); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                  }}
                  data-test="tag-edit-input"
                />
                <div class="edit-actions">
                  <IconButton icon="check" variant="ok" onclick={saveEdit} disabled={busy} tooltip={t('settings.tags.save')} testId="tag-edit-save" />
                  <IconButton icon="x" onclick={cancelEdit} tooltip={t('common.cancel')} testId="tag-edit-cancel" />
                </div>
              {:else}
                <button
                  class="name"
                  onclick={() => selectMode ? toggleSelect(tg.name) : startEdit(tg.name)}
                  data-test="tag-name"
                >{tg.name}</button>
                <div class="right" class:confirming={confirmDelete === tg.name}>
                  <span class="count">{tg.count}</span>
                  {#if !selectMode}
                    {#if confirmDelete === tg.name}
                      <div class="action confirm" in:fade={{ duration: 140 }}>
                        <span class="confirm-label">{t('settings.tags.delete_confirm')}</span>
                        <IconButton icon="check" variant="danger" onclick={() => doDelete(tg.name)} disabled={busy} testId="tag-delete-confirm" />
                        <IconButton icon="x" onclick={() => (confirmDelete = null)} testId="tag-delete-cancel" />
                      </div>
                    {:else}
                      <div class="action default" in:fade={{ duration: 140 }}>
                        <IconButton icon="pencil" onclick={() => startEdit(tg.name)} tooltip={t('settings.tags.rename')} testId="tag-rename" />
                        <IconButton icon="trash" variant="danger" onclick={() => (confirmDelete = tg.name)} tooltip={t('settings.tags.delete')} testId="tag-delete" />
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</section>

<style>
  .desc { color: var(--text2); font-size: 12px; margin: 0 0 12px; }
  .err {
    background: rgba(248,113,113,0.12);
    border: 1px solid rgba(248,113,113,0.4);
    border-radius: 8px;
    padding: 6px 10px;
    color: #f87171;
    font-size: 12px;
    margin: 0 0 12px;
  }
  .empty { color: var(--text3); font-size: 12px; margin: 0 0 8px; font-style: italic; }

  .toolbar {
    display: flex; gap: 8px; align-items: center; margin-bottom: 10px;
  }
  .search {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 8px;
    flex: 1;
    color: var(--text2);
  }
  .search input {
    flex: 1;
    background: transparent; border: none; outline: none;
    color: var(--text);
    font-size: 12px;
  }
  .search input::placeholder { color: var(--text3); }

  .merge-bar {
    display: flex; gap: 8px; align-items: center;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: 8px;
    margin-bottom: 10px;
  }
  .merge-count { font-size: 11px; color: var(--text2); white-space: nowrap; }
  .merge-target {
    flex: 1;
    padding: 5px 10px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    outline: none;
  }
  .merge-target:focus { border-color: var(--accent); }

  .list { list-style: none; padding: 0; margin: 0; }
  .list li {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 4px;
    transition: border-color 140ms, background 140ms;
  }
  .list li:hover { background: rgba(255,255,255,0.05); }
  .list li.editing { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .list li.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }

  .sel-mark {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    display: grid; place-items: center;
    background: transparent;
    color: #fff;
    cursor: pointer;
    transition: background 140ms, border-color 140ms;
  }
  .sel-mark:hover { border-color: var(--accent); }
  .sel-mark.on { background: var(--accent); border-color: var(--accent); }

  .name {
    flex: 1; min-width: 0;
    background: transparent; border: none;
    color: var(--text);
    font-size: 13px; font-weight: 500;
    text-align: left;
    padding: 2px 0;
    cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .name:hover { color: var(--sidebar-hi); }
  .count {
    font-size: 11px;
    color: var(--text3);
    font-variant-numeric: tabular-nums;
    padding: 2px 8px;
    background: rgba(255,255,255,0.04);
    border-radius: 999px;
  }
  .edit-input {
    flex: 1;
    padding: 4px 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--accent);
    border-radius: 6px;
    color: var(--text);
    font-size: 13px;
    outline: none;
  }
  .edit-actions { display: inline-flex; gap: 4px; }

  /* Count + actions pinned to the right; count hugs the buttons and
     pops a little when confirm prompt appears. */
  .right {
    display: flex; align-items: center; gap: 8px;
    flex-shrink: 0;
  }
  .right .count {
    transition:
      background 180ms var(--ease-out),
      color 180ms var(--ease-out),
      transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .right.confirming .count {
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    color: var(--sidebar-hi);
    transform: scale(1.12);
  }
  .action {
    display: inline-flex; align-items: center; gap: 6px;
    white-space: nowrap;
  }
  .action.confirm {
    font-size: 11px;
    color: var(--text2);
  }
  .confirm-label { padding: 0 2px; }
</style>
