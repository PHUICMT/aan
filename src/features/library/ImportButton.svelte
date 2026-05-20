<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import { bumpSeriesMutation } from '../../shared/lib/store.svelte';
  import { importFiles, importFolders, type ImportProgress } from './import-flow';
  import { portal } from '../../shared/lib/portal';

  let busy = $state(false);
  let progress = $state<ImportProgress | null>(null);
  let showSummary = $state(false);
  let summary = $state<ImportProgress | null>(null);
  let menuOpen = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();

  async function runImport(run: () => Promise<ImportProgress>, total: number) {
    busy = true;
    progress = { total, done: 0, current: '', errors: [], imported: [] };
    try {
      const final = await run();
      summary = final;
      showSummary = final.imported.length > 0 || final.errors.length > 0;
      if (final.imported.length > 0) bumpSeriesMutation();
    } finally {
      busy = false;
      progress = null;
    }
  }

  async function pickFiles() {
    menuOpen = false;
    if (busy) return;
    const picked = await openDialog({
      multiple: true,
      filters: [
        { name: 'Supported', extensions: ['pdf', 'cbz', 'epub', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'CBZ (Comic archive)', extensions: ['cbz'] },
        { name: 'EPUB (Novel)', extensions: ['epub'] },
        { name: 'Text (novel)', extensions: ['txt'] },
      ],
    });
    if (!picked) return;
    const paths = Array.isArray(picked) ? picked : [picked];
    if (paths.length === 0) return;
    await runImport(() => importFiles(paths, (p) => { progress = { ...p }; }), paths.length);
  }

  async function pickFolder() {
    menuOpen = false;
    if (busy) return;
    const picked = await openDialog({ multiple: true, directory: true });
    if (!picked) return;
    const paths = Array.isArray(picked) ? picked : [picked];
    if (paths.length === 0) return;
    await runImport(() => importFolders(paths, (p) => { progress = { ...p }; }), paths.length);
  }

  function closeMenuOnOutside(node: HTMLElement) {
    function handle(e: MouseEvent) {
      const tgt = e.target as Node | null;
      if (!tgt) return;
      if (node.contains(tgt)) return;
      if (triggerEl && triggerEl.contains(tgt)) return;
      menuOpen = false;
    }
    setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return { destroy() { document.removeEventListener('mousedown', handle); } };
  }
</script>

<div class="wrap">
  <button
    bind:this={triggerEl}
    type="button"
    class="import-btn"
    class:busy
    class:open={menuOpen}
    onclick={() => (menuOpen = !menuOpen)}
    disabled={busy}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    use:tooltip={t('library.import.tooltip')}
    data-test="library-import"
  >
    <Icon name="plus" size={14} />
    <span>{t('library.import.label')}</span>
    <span class="caret" class:flip={menuOpen}>
      <Icon name="chevron_down" size={12} />
    </span>
  </button>

  {#if menuOpen}
    <ul
      class="menu"
      role="menu"
      transition:scale={{ duration: 140, start: 0.94, easing: cubicOut }}
      use:closeMenuOnOutside
    >
      <li>
        <button type="button" class="menu-item" onclick={pickFiles} role="menuitem">
          <Icon name="plus" size={12} />
          <span>{t('library.import.menu_files')}</span>
        </button>
      </li>
      <li>
        <button type="button" class="menu-item" onclick={pickFolder} role="menuitem">
          <Icon name="inbox" size={12} />
          <span>{t('library.import.menu_folder')}</span>
        </button>
      </li>
    </ul>
  {/if}
</div>

{#if progress && busy}
  <div class="overlay" transition:fade={{ duration: 140 }} use:portal>
    <div class="card" transition:scale={{ duration: 200, start: 0.95, easing: cubicOut }}>
      <h3>{t('library.import.busy_title')}</h3>
      <div class="bar">
        <div class="bar-fill" style:width="{(progress.done / Math.max(progress.total, 1)) * 100}%"></div>
      </div>
      <p class="count">{progress.done} / {progress.total}</p>
      {#if progress.current}
        <p class="cur">{progress.current}</p>
      {/if}
    </div>
  </div>
{/if}

{#if showSummary && summary}
  <div
    class="overlay"
    transition:fade={{ duration: 140 }}
    onclick={() => (showSummary = false)}
    use:portal
    role="presentation"
  >
    <div
      class="card"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      transition:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') showSummary = false; }}
    >
      <h3>{t('library.import.done_title')}</h3>
      <p class="ok">
        {summary.imported.length} {t('library.import.imported_suffix')}
      </p>
      {#if summary.errors.length > 0}
        <p class="err">
          {summary.errors.length} {t('library.import.failed_suffix')}
        </p>
        <ul class="err-list">
          {#each summary.errors as e (e.file)}
            <li><strong>{e.file}</strong> — {e.error}</li>
          {/each}
        </ul>
      {/if}
      <div class="actions">
        <button type="button" class="ok-btn" onclick={() => (showSummary = false)}>
          {t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .wrap { position: relative; display: inline-block; }
  .caret {
    display: inline-flex;
    margin-left: 2px;
    transition: transform 160ms var(--ease-out, ease-out);
  }
  .caret.flip { transform: rotate(180deg); }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 50;
    list-style: none;
    margin: 0;
    padding: 4px;
    min-width: 200px;
    background: var(--menu-bg, #1a1530);
    border: 1px solid var(--border, rgba(255,255,255,0.12));
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
    transform-origin: top right;
  }
  .menu li { margin: 0; }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: transparent;
    border: none;
    color: var(--text, #fff);
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    transition: background 120ms;
  }
  .menu-item:hover { background: color-mix(in srgb, var(--accent, #7c5cff) 18%, transparent); }
  .import-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    background: var(--accent, #7c5cff);
    color: #fff;
    border: 1px solid color-mix(in srgb, var(--accent, #7c5cff) 60%, #fff 0%);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 140ms var(--ease-out, ease-out), background 140ms;
  }
  .import-btn:hover:not(.busy) {
    background: color-mix(in srgb, var(--accent, #7c5cff) 88%, #fff 12%);
    transform: translateY(-1px);
  }
  .import-btn.busy { opacity: 0.6; cursor: progress; }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
    display: grid;
    place-items: center;
    z-index: 1000;
  }
  .card {
    width: min(420px, 92vw);
    padding: 24px;
    background: var(--surface, #15102a);
    border: 1px solid var(--border, rgba(255,255,255,0.12));
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  }
  h3 { margin: 0 0 12px; font-size: 16px; color: var(--text, #fff); }
  .bar {
    width: 100%;
    height: 6px;
    background: var(--border, rgba(255,255,255,0.1));
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: var(--accent, #7c5cff);
    transition: width 180ms var(--ease-out, ease-out);
  }
  .count { margin: 8px 0 4px; font-size: 12px; color: var(--muted, rgba(255,255,255,0.7)); }
  .cur {
    margin: 0;
    font-size: 11.5px;
    color: var(--muted, rgba(255,255,255,0.55));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ok { color: var(--text, #fff); font-size: 13px; }
  .err { color: #f87171; font-size: 13px; margin-top: 8px; }
  .err-list {
    max-height: 140px;
    overflow-y: auto;
    font-size: 11.5px;
    color: var(--muted, rgba(255,255,255,0.7));
    padding-left: 18px;
  }
  .actions { display: flex; justify-content: flex-end; margin-top: 16px; }
  .ok-btn {
    padding: 6px 14px;
    border-radius: 8px;
    background: var(--accent, #7c5cff);
    color: #fff;
    border: none;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
  }
</style>
