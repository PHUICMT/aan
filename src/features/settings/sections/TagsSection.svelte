<script lang="ts">
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
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
          <button class="btn ghost" onclick={() => (selectMode = true)} disabled={tags.length < 2} data-test="tags-select-mode">
            <Icon name="check" size={12} />
            {t('settings.tags.merge_mode')}
          </button>
        {:else}
          <button class="btn ghost" onclick={exitSelectMode} data-test="tags-select-cancel">
            {t('common.cancel')}
          </button>
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
          <button
            class="btn primary"
            onclick={doMerge}
            disabled={busy || !mergeTarget.trim() || selected.size === 0}
            data-test="tags-merge-go"
          >{t('settings.tags.merge')}</button>
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
                  <button class="btn-icon ok" onclick={saveEdit} disabled={busy} aria-label={t('settings.tags.save')} use:tooltip={t('settings.tags.save')} data-test="tag-edit-save">
                    <Icon name="check" size={12} />
                  </button>
                  <button class="btn-icon" onclick={cancelEdit} aria-label={t('common.cancel')} use:tooltip={t('common.cancel')} data-test="tag-edit-cancel">
                    <Icon name="x" size={11} />
                  </button>
                </div>
              {:else}
                <button
                  class="name"
                  onclick={() => selectMode ? toggleSelect(tg.name) : startEdit(tg.name)}
                  data-test="tag-name"
                >{tg.name}</button>
                <span class="count">{tg.count}</span>
                {#if !selectMode}
                  <div class="row-actions">
                    <div class="action-stack" class:show-confirm={confirmDelete === tg.name}>
                      <div class="action default">
                        <button class="btn-icon edit" onclick={() => startEdit(tg.name)} aria-label={t('settings.tags.rename')} use:tooltip={t('settings.tags.rename')} data-test="tag-rename">
                          <Icon name="pencil" size={11} />
                        </button>
                        <button class="btn-icon trash" onclick={() => (confirmDelete = tg.name)} aria-label={t('settings.tags.delete')} use:tooltip={t('settings.tags.delete')} data-test="tag-delete">
                          <Icon name="trash" size={11} />
                        </button>
                      </div>
                      <div class="action confirm">
                        <span>{t('settings.tags.delete_confirm')}</span>
                        <button class="btn-icon danger" onclick={() => doDelete(tg.name)} disabled={busy} data-test="tag-delete-confirm">
                          <Icon name="check" size={12} />
                        </button>
                        <button class="btn-icon" onclick={() => (confirmDelete = null)} data-test="tag-delete-cancel">
                          <Icon name="x" size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                {/if}
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
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px; font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.04);
    color: var(--text);
    transition: background 140ms var(--ease-out), color 140ms;
  }
  .btn:hover:not(:disabled) { background: var(--accent-dim); color: var(--sidebar-hi); }
  .btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .btn.primary:hover:not(:disabled) { filter: brightness(1.08); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
  .btn-icon {
    width: 26px; height: 26px;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text2);
    cursor: pointer;
    transition: background 140ms, color 140ms, border-color 140ms;
  }
  .btn-icon:hover:not(:disabled) { background: var(--accent-dim); color: var(--text); border-color: var(--accent); }
  .btn-icon.ok { color: #86efac; }
  .btn-icon.ok:hover { background: rgba(74,222,128,0.14); border-color: #4ade80; }
  .btn-icon.danger { color: #f87171; border-color: rgba(248,113,113,0.4); }
  .btn-icon.danger:hover { background: rgba(248,113,113,0.16); }
  .btn-icon.trash { color: #f87171; }
  .btn-icon.trash:hover { background: rgba(248,113,113,0.14); border-color: rgba(248,113,113,0.5); }
  .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Cross-fade between [edit/trash] and [confirm + check/x] in place so
     the row width never jumps during the toggle. */
  .row-actions {
    position: relative;
    min-width: 156px;
    height: 26px;
    display: flex; align-items: center; justify-content: flex-end;
  }
  .action-stack { position: relative; width: 100%; height: 100%; }
  .action {
    position: absolute; inset: 0;
    display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;
    transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out);
  }
  .action.default { opacity: 1; transform: translateX(0); }
  .action.confirm {
    opacity: 0; transform: translateX(6px);
    pointer-events: none;
    font-size: 11px;
    color: var(--text2);
  }
  .action-stack.show-confirm .default { opacity: 0; transform: translateX(-6px); pointer-events: none; }
  .action-stack.show-confirm .confirm { opacity: 1; transform: translateX(0); pointer-events: auto; }
</style>
