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
  // Tracked for the cursor-following sheen on hover; clamped 0-1 within
  // the button rect. Listener only attaches while the user is over it.
  let sheenX = $state(0.5);
  let sheenY = $state(0.5);
  function onMove(e: MouseEvent) {
    if (!triggerEl) return;
    const r = triggerEl.getBoundingClientRect();
    sheenX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    sheenY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  }

  async function runImport(run: () => Promise<ImportProgress>, total: number) {
    busy = true;
    progress = { total, done: 0, current: '', errors: [], imported: [], duplicates: [] };
    try {
      const final = await run();
      summary = final;
      showSummary = final.imported.length > 0 || final.errors.length > 0 || final.duplicates.length > 0;
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
    onmousemove={onMove}
    disabled={busy}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    use:tooltip={t('library.import.tooltip')}
    data-test="library-import"
    style:--mx="{Math.round(sheenX * 100)}%"
    style:--my="{Math.round(sheenY * 100)}%"
  >
    <span class="sheen" aria-hidden="true"></span>
    <span class="icon-wrap"><Icon name="plus" size={14} /></span>
    <span class="lbl">{t('library.import.label')}</span>
    <span class="caret" class:flip={menuOpen}>
      <Icon name="chevron_down" size={12} />
    </span>
    {#if busy}
      <span class="busy-ring" aria-hidden="true"></span>
    {/if}
  </button>

  {#if menuOpen}
    <ul
      class="menu"
      role="menu"
      transition:scale={{ duration: 140, start: 0.94, easing: cubicOut }}
      use:closeMenuOnOutside
    >
      <li style:--i={0}>
        <button type="button" class="menu-item" onclick={pickFiles} role="menuitem">
          <span class="mi-icon"><Icon name="file_text" size={13} /></span>
          <span>{t('library.import.menu_files')}</span>
        </button>
      </li>
      <li style:--i={1}>
        <button type="button" class="menu-item" onclick={pickFolder} role="menuitem">
          <span class="mi-icon"><Icon name="folder_open" size={13} /></span>
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
      {#if summary.duplicates.length > 0}
        <p class="dup">
          {summary.duplicates.length} {t('library.import.duplicate_suffix')}
        </p>
        <ul class="dup-list">
          {#each summary.duplicates as d (d.file)}
            <li><strong>{d.file}</strong></li>
          {/each}
        </ul>
      {/if}
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

  /* The button: gradient fill + cursor-following sheen + tiny lift on
     hover + spring-y press. Looks like a primary CTA from a modern
     design system without leaving the Aan tokens. */
  .import-btn {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px 9px 12px;
    border-radius: 10px;
    background:
      linear-gradient(135deg,
        color-mix(in srgb, var(--accent) 92%, white 8%) 0%,
        color-mix(in srgb, var(--accent) 75%, black 0%) 100%);
    color: #fff;
    border: 1px solid color-mix(in srgb, var(--accent) 60%, white 0%);
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    overflow: hidden;
    box-shadow:
      0 4px 14px -4px color-mix(in srgb, var(--accent) 60%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.18);
    transition:
      transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 200ms var(--ease-out),
      filter 160ms var(--ease-out);
  }
  .import-btn:hover:not(.busy) {
    transform: translateY(-1px);
    box-shadow:
      0 8px 22px -6px color-mix(in srgb, var(--accent) 70%, transparent),
      0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.24);
    filter: brightness(1.06);
  }
  .import-btn:active:not(.busy) {
    transform: translateY(0) scale(0.98);
    transition-duration: 60ms;
  }
  .import-btn.open {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 26%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.22);
  }
  .import-btn.busy { cursor: progress; filter: saturate(0.85) brightness(0.95); }

  /* Cursor-following sheen via radial-gradient anchored at --mx/--my. */
  .sheen {
    position: absolute; inset: 0;
    pointer-events: none;
    background: radial-gradient(
      180px circle at var(--mx, 50%) var(--my, 50%),
      rgba(255,255,255,0.28),
      rgba(255,255,255,0) 60%
    );
    opacity: 0;
    transition: opacity 200ms var(--ease-out);
    z-index: 0;
  }
  .import-btn:hover .sheen { opacity: 1; }
  .import-btn.busy .sheen { opacity: 0; }
  .import-btn > * { position: relative; z-index: 1; }

  /* Plus icon: gentle wiggle on hover; rotates to a + → × hint when open. */
  .icon-wrap {
    display: inline-flex; align-items: center; justify-content: center;
    transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .import-btn:hover:not(.busy) .icon-wrap { transform: rotate(90deg) scale(1.05); }
  .import-btn.open .icon-wrap { transform: rotate(45deg); }
  .lbl { white-space: nowrap; }
  .caret {
    display: inline-flex;
    margin-left: 2px;
    opacity: 0.85;
    transition: transform 200ms var(--ease-out), opacity 160ms;
  }
  .caret.flip { transform: rotate(180deg); opacity: 1; }

  /* Busy state: a rotating conic-gradient ring around the button. */
  .busy-ring {
    position: absolute; inset: -2px;
    border-radius: 12px;
    padding: 2px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      color-mix(in srgb, var(--accent) 65%, white 35%) 90deg,
      transparent 180deg,
      color-mix(in srgb, var(--accent) 65%, white 35%) 270deg,
      transparent 360deg
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
            mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    animation: ring-spin 1.4s linear infinite;
    z-index: 0;
    pointer-events: none;
  }
  @keyframes ring-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .import-btn, .icon-wrap, .sheen, .caret { transition: none; }
    .busy-ring { animation: none; }
  }

  /* Menu polish: glassy backdrop, larger hit area, stagger entrance. */
  .menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 50;
    list-style: none;
    margin: 0;
    padding: 6px;
    min-width: 240px;
    background: color-mix(in srgb, var(--menu-bg) 88%, transparent);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--glass-border, var(--border));
    border-radius: 12px;
    box-shadow:
      0 18px 40px -10px rgba(0,0,0,0.55),
      0 0 0 1px rgba(255,255,255,0.04) inset;
    transform-origin: top right;
  }
  .menu li {
    margin: 0;
    opacity: 0;
    transform: translateY(-6px);
    animation: mi-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    animation-delay: calc(var(--i, 0) * 50ms + 30ms);
  }
  @keyframes mi-in {
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .menu li { opacity: 1; transform: none; animation: none; }
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: background 140ms var(--ease-out), color 140ms;
  }
  .menu-item:hover {
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    color: #fff;
  }
  .mi-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px;
    border-radius: 7px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: color-mix(in srgb, var(--accent) 80%, white 20%);
    flex-shrink: 0;
    transition: background 140ms var(--ease-out), transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .menu-item:hover .mi-icon {
    background: var(--accent);
    color: #fff;
    transform: scale(1.08);
  }

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
  .err-list, .dup-list {
    max-height: 140px;
    overflow-y: auto;
    font-size: 11.5px;
    color: var(--muted, rgba(255,255,255,0.7));
    padding-left: 18px;
  }
  .dup { color: #fbbf24; font-size: 13px; margin-top: 8px; }
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
