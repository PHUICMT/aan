<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Icon from '../shared/components/Icon.svelte';
  import { t } from '../shared/lib/i18n.svelte';

  const win = getCurrentWindow();

  onMount(() => {
    // Tray icon events don't always transfer focus on Windows.
    void win.setFocus();

    const p = win.onFocusChanged(({ payload }) => {
      if (!payload) void win.hide();
    });

    // onFocusChanged occasionally misses the first blur on Windows.
    let poll = 0 as unknown as ReturnType<typeof setInterval>;
    poll = setInterval(async () => {
      try {
        if (!(await win.isFocused())) await win.hide();
      } catch {}
    }, 200);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') void win.hide();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      void p.then((f) => f());
      clearInterval(poll);
      window.removeEventListener('keydown', onKey);
    };
  });

  async function dismiss() { await win.hide(); }

  async function showApp() {
    // Dismiss first to release focus, else Windows blocks the main
    // window from coming forward when minimized.
    await dismiss();
    try { await invoke('show_main_window'); } catch {}
  }
  async function quitApp() {
    try { await invoke('quit_app'); } catch {}
  }
</script>

<div class="tray-menu">
  <div class="row" role="button" tabindex="0" onclick={showApp} onkeydown={(e) => e.key === 'Enter' && showApp()}>
    <Icon name="book_open" size={13} />
    <span>{t('tray.show')}</span>
  </div>
  <div class="row danger" role="button" tabindex="0" onclick={quitApp} onkeydown={(e) => e.key === 'Enter' && quitApp()}>
    <Icon name="x" size={13} />
    <span>{t('tray.quit')}</span>
  </div>
</div>

<style>
  :global(html[data-win="tray_menu"]),
  :global(html[data-win="tray_menu"] body),
  :global(html[data-win="tray_menu"] #app) {
    background: transparent !important;
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
  /* OS acrylic provides blur/tint — #app + body must not paint over it.
     Scoped to tray_menu so the main app's #app rule is untouched. */
  :global(html[data-win="tray_menu"] #app) {
    position: static !important;
    transform: none !important;
  }
  .tray-menu {
    /* `position: fixed; inset: 0` — 100vw/100vh left a 1-2px gutter at
       the rounded region's edge. */
    position: fixed;
    inset: 0;
    padding: 6px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #1a1c28;
    border: 0;
    color: var(--text, #e5e7eb);
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 12.5px;
    animation: pop-in 140ms cubic-bezier(0.2, 0, 0, 1);
  }
  @keyframes pop-in {
    from { opacity: 0; transform: scale(0.96) translateY(2px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border-radius: 6px;
    background: transparent;
    border: 0;
    outline: 0;
    box-shadow: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease-out;
    appearance: none;
    -webkit-appearance: none;
  }
  .row:focus,
  .row:focus-visible,
  .row:active {
    outline: 0;
    box-shadow: none;
  }
  .row:hover {
    background: color-mix(in srgb, #ffffff 8%, transparent);
  }
  .row.danger {
    color: #fda4af;
  }
  .row.danger:hover {
    background: rgba(244, 63, 94, 0.16);
  }
</style>
