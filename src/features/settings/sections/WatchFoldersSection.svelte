<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import Icon from '../../../shared/components/Icon.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { tooltip } from '../../../shared/lib/tooltip';
  import {
    listWatchFolders,
    addWatchFolder,
    removeWatchFolder,
  } from '../../../shared/lib/api';
  import { bumpSeriesMutation } from '../../../shared/lib/store.svelte';

  type Props = {
    open: boolean;
    searching: boolean;
    query: string;
    onToggle: () => void;
  };
  let { open, searching, onToggle }: Props = $props();

  let folders = $state<string[]>([]);
  let busy = $state(false);
  let recent = $state<{ path: string; ok: boolean; message: string; at: number }[]>([]);
  let unlisten: UnlistenFn | null = null;

  async function refresh() {
    try { folders = await listWatchFolders(); } catch { folders = []; }
  }

  async function onAdd() {
    if (busy) return;
    busy = true;
    try {
      const picked = await openDialog({ multiple: false, directory: true });
      if (picked && !Array.isArray(picked)) {
        await addWatchFolder(picked);
        await refresh();
      }
    } catch (e) {
      console.warn('add watch folder failed', e);
    } finally {
      busy = false;
    }
  }

  async function onRemove(p: string) {
    busy = true;
    try {
      await removeWatchFolder(p);
      await refresh();
    } finally {
      busy = false;
    }
  }

  onMount(async () => {
    await refresh();
    try {
      unlisten = await listen<{ path: string; ok: boolean; message: string }>(
        'aan:watch-imported',
        (ev) => {
          recent = [{ ...ev.payload, at: Date.now() }, ...recent].slice(0, 5);
          if (ev.payload.ok) bumpSeriesMutation();
        },
      );
    } catch { /* tauri event bus unavailable in non-tauri tests */ }
  });

  onDestroy(() => { try { unlisten?.(); } catch {} });
</script>

<section class="group" class:open data-test="settings-section-watch">
  <button class="group-head" onclick={onToggle} disabled={searching}>
    <span class="sec-icon"><Icon name="folder_open" size={14} /></span>
    <h2>{t('settings.section.watch')}</h2>
    <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
  </button>
  {#if open}
    <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
      <p class="desc">{t('settings.watch.desc')}</p>

      {#if folders.length === 0}
        <p class="empty">{t('settings.watch.none')}</p>
      {:else}
        <ul class="list">
          {#each folders as f (f)}
            <li>
              <span class="path" use:tooltip={f}>{f}</span>
              <button
                class="rm"
                onclick={() => onRemove(f)}
                disabled={busy}
                aria-label={t('settings.watch.remove')}
                use:tooltip={t('settings.watch.remove')}
              >
                <Icon name="trash" size={12} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <button class="add" onclick={onAdd} disabled={busy}>
        <Icon name="plus" size={12} />
        {t('settings.watch.add')}
      </button>

      {#if recent.length > 0}
        <div class="recent">
          <h3>{t('settings.watch.recent')}</h3>
          <ul>
            {#each recent as r, i (r.at + i)}
              <li class:err={!r.ok} transition:fade={{ duration: 160 }}>
                <Icon name={r.ok ? 'check' : 'x'} size={10} />
                <span>{r.message}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .desc { color: var(--text2); font-size: 12px; margin: 0 0 12px; }
  .empty { color: var(--text3); font-size: 12px; margin: 0 0 12px; font-style: italic; }
  .list { list-style: none; padding: 0; margin: 0 0 12px; }
  .list li {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 6px;
  }
  .path {
    flex: 1; min-width: 0;
    font-size: 12px;
    color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-family: var(--font-mono);
  }
  .rm {
    width: 26px; height: 26px;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: #f87171;
    cursor: pointer;
    transition: background 140ms;
  }
  .rm:hover:not(:disabled) { background: rgba(248,113,113,0.14); }
  .add {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    background: var(--accent-dim);
    color: var(--sidebar-hi);
    font-size: 12px; font-weight: 600;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 140ms;
  }
  .add:hover:not(:disabled) { background: var(--accent); color: #fff; }
  .recent { margin-top: 16px; }
  .recent h3 { font-size: 11px; color: var(--text3); margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.06em; }
  .recent ul { list-style: none; padding: 0; margin: 0; }
  .recent li {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 8px;
    background: rgba(74, 222, 128, 0.08);
    border-radius: 6px;
    font-size: 11px;
    color: #86efac;
    margin-bottom: 4px;
  }
  .recent li.err { background: rgba(248,113,113,0.10); color: #f87171; }
</style>
