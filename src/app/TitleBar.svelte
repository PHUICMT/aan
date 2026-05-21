<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import Icon from '../shared/components/Icon.svelte';
  import logoMark from '../assets/logo-mark.svg';
  import logoWordmark from '../assets/logo-wordmark.svg?raw';

  const win = getCurrentWindow();
  let isMax = $state(false);

  win.onResized(async () => { isMax = await win.isMaximized(); });

  async function toggleMax() {
    if (await win.isMaximized()) await win.unmaximize();
    else await win.maximize();
    isMax = await win.isMaximized();
  }
</script>

<div class="titlebar" data-tauri-drag-region data-test="titlebar">
  <div class="brand" data-tauri-drag-region>
    <img class="brand-mark" src={logoMark} alt="" />
    <span class="brand-wordmark" aria-label="Aan">{@html logoWordmark}</span>
  </div>
  <div class="drag" data-tauri-drag-region data-test="title-drag"></div>
  <div class="wm">
    <button class="wm-btn" onclick={() => win.minimize()} data-test="title-min">
      <Icon name="minus" size={14} />
    </button>
    <button class="wm-btn" onclick={toggleMax} data-test="title-max">
      <Icon name={isMax ? 'restore' : 'maximize'} size={12} />
    </button>
    <button class="wm-btn close" onclick={() => win.close()} data-test="title-close">
      <Icon name="x" size={14} />
    </button>
  </div>
</div>

<style>
  .titlebar {
    height: 38px;
    display: flex;
    align-items: stretch;
    background: var(--chrome-bg-2);
    backdrop-filter: blur(24px) saturate(1.4);
    border-bottom: 1px solid var(--border-soft);
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }
  .brand { display: flex; align-items: center; gap: 8px; padding: 0 14px; flex-shrink: 0; }
  .brand-mark {
    width: 18px; height: 18px;
    border-radius: 5px;
    box-shadow: 0 0 0 1px rgba(167,139,250,0.18), 0 4px 12px -4px var(--accent-glow);
    -webkit-user-drag: none;
    user-select: none;
    pointer-events: none;
  }
  .brand-wordmark {
    display: inline-flex; align-items: center;
    color: var(--sidebar-hi);
    user-select: none;
    pointer-events: none;
  }
  .brand-wordmark :global(svg) {
    height: 14px; width: auto;
    display: block;
  }
  .drag { flex: 1; }
  .wm { display: flex; align-items: stretch; }
  .wm-btn {
    width: 46px; display: grid; place-items: center;
    color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .wm-btn:hover { background: var(--hover-bg); color: var(--text); }
  .wm-btn.close:hover { background: #ef4444; color: #fff; }
</style>
