<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { portal, anchorBelow } from '../../shared/lib/portal';
  import { t } from '../../shared/lib/i18n.svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import BrightnessControls from './BrightnessControls.svelte';

  type Mode = 'continuous' | 'paged' | 'spread';
  type Layout = 'paged' | 'scroll';
  type Dpage = 'off' | 'auto' | 'always';

  type Props = {
    mode: Mode;
    bg: 'dark' | 'light';
    anim: boolean;
    rtl: boolean;
    spreadSolo: boolean;
    dpage: Dpage;
    dpageCoverSolo: boolean;
    immersiveOn: boolean;
    onSetMode: (m: Mode) => void;
    onSetLayout: (l: Layout) => void;
    onToggleBg: () => void;
    onToggleAnim: () => void;
    onToggleRtl: () => void;
    onToggleSpreadSolo: () => void;
    onCycleDpage: () => void;
    onToggleDpageCoverSolo: () => void;
    onToggleImmersive: () => void;
  };
  let {
    mode, bg, anim, rtl, spreadSolo, dpage, dpageCoverSolo, immersiveOn,
    onSetMode, onSetLayout, onToggleBg, onToggleAnim, onToggleRtl,
    onToggleSpreadSolo, onCycleDpage, onToggleDpageCoverSolo, onToggleImmersive,
  }: Props = $props();

  function popMenu(_node: Element, { duration = 180 }: { duration?: number } = {}) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => {
        const offset = (1 - t) * -4;
        const sc = 0.96 + t * 0.04;
        return `opacity: ${t}; transform: translateY(${offset}px) scale(${sc}); transform-origin: top right;`;
      },
    };
  }

  let settingsOpen = $state(false);
  let settingsToggleEl = $state<HTMLButtonElement | null>(null);
  let settingsPos = $state({ top: 0, right: 16 });
  $effect(() => {
    if (!settingsOpen || !settingsToggleEl) return;
    settingsPos = anchorBelow(settingsToggleEl, { gap: 6 });
  });
  function closeSettingsOnOutside(node: HTMLElement, onOutside: () => void) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (settingsToggleEl && settingsToggleEl.contains(target)) return;
      onOutside();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }
</script>

<div class="set-wrap">
  <button
    bind:this={settingsToggleEl}
    class="mode set-toggle"
    class:on={settingsOpen}
    onclick={() => (settingsOpen = !settingsOpen)}
    use:tooltip={t('reader.settings')}
    aria-label={t('reader.settings')}
    data-test="reader-settings-toggle"
  >
    <Icon name="settings" size={13} />
  </button>
  {#if settingsOpen}
    <div
      class="set-scrim"
      use:portal
      aria-hidden="true"
    ></div>
    <div
      class="set-menu"
      role="menu"
      style:top="{settingsPos.top}px"
      style:right="{settingsPos.right}px"
      transition:popMenu
      use:portal
      use:closeSettingsOnOutside={() => (settingsOpen = false)}
    >
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name={mode === 'continuous' ? 'scroll' : mode === 'spread' ? 'book_open' : 'file_text'} size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.mode.title')}</div>
          <div class="set-desc">{t('reader.mode.desc')}</div>
        </div>
        <div class="set-seg" style:--active-idx={mode === 'paged' ? 0 : mode === 'continuous' ? 1 : 2}>
          <span class="seg-indicator" aria-hidden="true"></span>
          <button class="seg-btn" class:active={mode === 'paged'} onclick={() => { onSetMode('paged'); onSetLayout('paged'); }} data-test="reader-mode-paged">{t('reader.mode.paged')}</button>
          <button class="seg-btn" class:active={mode === 'continuous'} onclick={() => { onSetMode('continuous'); onSetLayout('scroll'); }} data-test="reader-mode-continuous">{t('reader.mode.continuous')}</button>
          <button class="seg-btn" class:active={mode === 'spread'} onclick={() => { onSetMode('spread'); onSetLayout('paged'); }} data-test="reader-mode-spread">{t('reader.mode.spread')}</button>
        </div>
      </div>
      <button class="set-row" onclick={onToggleBg} data-test="reader-bg-toggle">
        <div class="set-icon"><Icon name={bg === 'dark' ? 'moon' : 'sun'} size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.bg.title')}</div>
          <div class="set-desc">{t('reader.bg.desc')}</div>
        </div>
        <div class="set-value">{bg === 'dark' ? t('reader.bg.dark') : t('reader.bg.light')}</div>
      </button>
      <button class="set-row" onclick={onToggleAnim} data-test="reader-anim-toggle">
        <div class="set-icon"><Icon name="sync" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.anim.title')}</div>
          <div class="set-desc">{t('reader.anim.desc')}</div>
        </div>
        <div class="set-value" class:on={anim}>{anim ? t('reader.anim.on') : t('reader.anim.off')}</div>
      </button>
      <button
        class="set-row"
        onclick={onToggleRtl}
        disabled={mode === 'continuous'}
        use:tooltip={mode === 'continuous' ? 'Reading direction does not apply to scroll layout' : ''}
        data-test="reader-rtl-toggle"
      >
        <div class="set-icon"><Icon name={rtl ? 'chevron_left' : 'chevron_right'} size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.rtl.title')}</div>
          <div class="set-desc">{t('reader.rtl.desc')}</div>
        </div>
        <div class="set-value" class:on={rtl}>{rtl ? t('reader.rtl.rtl') : t('reader.rtl.ltr')}</div>
      </button>
      {#if mode === 'spread'}
        <div transition:slide={{ duration: 220, easing: cubicOut }}>
          <button class="set-row" onclick={onToggleSpreadSolo} data-test="reader-spread-solo">
            <div class="set-icon"><Icon name="book_open" size={14} /></div>
            <div class="set-text">
              <div class="set-title">{t('reader.solo.title')}</div>
              <div class="set-desc">{t('reader.solo.desc')}</div>
            </div>
            <div class="set-value" class:on={spreadSolo}>{spreadSolo ? t('reader.anim.on') : t('reader.anim.off')}</div>
          </button>
        </div>
      {/if}
      <button
        class="set-row"
        onclick={onCycleDpage}
        disabled={mode === 'continuous'}
        use:tooltip={mode === 'continuous' ? 'Double-page is unavailable in scroll layout' : ''}
        data-test="reader-dpage-cycle"
      >
        <div class="set-icon"><Icon name="book_open" size={14} /></div>
        <div class="set-text">
          <div class="set-title">Double page</div>
          <div class="set-desc">Pair pages side-by-side (auto = only when both are portrait)</div>
        </div>
        <div class="set-value" class:on={dpage !== 'off'}>
          {dpage === 'off' ? 'Off' : dpage === 'auto' ? 'Auto' : 'Always'}
        </div>
      </button>
      {#if dpage !== 'off'}
        <div transition:slide={{ duration: 220, easing: cubicOut }}>
          <button class="set-row" onclick={onToggleDpageCoverSolo} data-test="reader-dpage-cover-solo">
            <div class="set-icon"><Icon name="image" size={14} /></div>
            <div class="set-text">
              <div class="set-title">Cover page solo</div>
              <div class="set-desc">Render page 1 alone, then pair (2,3), (4,5)…</div>
            </div>
            <div class="set-value" class:on={dpageCoverSolo}>{dpageCoverSolo ? t('reader.anim.on') : t('reader.anim.off')}</div>
          </button>
        </div>
      {/if}
      <button class="set-row" onclick={onToggleImmersive} data-test="reader-immersive-toggle">
        <div class="set-icon"><Icon name="maximize" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.immersive.title')}</div>
          <div class="set-desc">{t('reader.immersive.desc')}</div>
        </div>
        <div class="set-value" class:on={immersiveOn}>{immersiveOn ? t('reader.immersive.on') : t('reader.immersive.off')}</div>
      </button>
      <div class="set-divider"></div>
      <div class="set-section-label">{t('reader.section.visibility')}</div>
      <div class="set-row brightness-row">
        <BrightnessControls />
      </div>
    </div>
  {/if}
</div>

<style>
  .set-wrap { position: relative; display: inline-flex; }
  .mode {
    height: 26px; padding: 0 10px; border-radius: 6px;
    background: rgba(255,255,255,0.04); color: var(--text2);
    font-size: 11px; letter-spacing: 0.4px;
    display: inline-flex; align-items: center; gap: 6px;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .mode:hover { background: var(--accent-dim); color: var(--text); }
  .set-toggle { padding: 0; width: 28px; justify-content: center; }
  .set-toggle.on { background: var(--accent-dim); color: var(--text); }
  :global(.reader-root.bg-light) .mode { background: rgba(0,0,0,0.04); color: #4b5263; }
  :global(.reader-root.bg-light) .mode:hover { background: rgba(124,58,237,0.14); color: #1f2233; }
  :global(.reader-root.bg-light) .set-toggle.on { background: rgba(124,58,237,0.18); color: #5b21b6; }
  .set-scrim {
    position: fixed; inset: 0;
    background: var(--scrim-bg);
    z-index: 1999;
    pointer-events: none;
    animation: rs-fade 180ms var(--ease-out) both;
  }
  @keyframes rs-fade { from { opacity: 0; } to { opacity: 1; } }
  .set-menu {
    position: fixed;
    min-width: 320px;
    padding: 4px;
    background: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: var(--panel-shadow);
    z-index: 2000;
    display: flex; flex-direction: column; gap: 1px;
  }
  @supports not (backdrop-filter: blur(1px)) {
    .set-menu { background: var(--menu-bg); }
  }
  .set-row {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    width: 100%;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    text-align: left;
    transition: background 0.12s var(--ease-out);
  }
  .set-row:hover { background: var(--hover-bg); }
  .set-row:disabled { opacity: 0.45; cursor: not-allowed; }
  .set-row:disabled:hover { background: transparent; }
  .set-row.brightness-row {
    display: block;
    grid-template-columns: none;
    cursor: default; padding: 4px 12px 8px;
  }
  .set-row.brightness-row:hover { background: transparent; }
  .set-divider { height: 1px; background: var(--border-soft); margin: 4px 6px; }
  .set-section-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
    padding: 4px 12px 2px;
  }
  .set-icon { display: grid; place-items: center; color: var(--text2); }
  .set-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .set-title { font-size: 12px; font-weight: 600; color: var(--text); }
  .set-desc { font-size: 10px; color: var(--text); line-height: 1.4; white-space: normal; opacity: 0.72; }
  .set-value {
    padding: 3px 10px; border-radius: 9999px;
    background: rgba(255,255,255,0.12); color: var(--text);
    font-size: 10px; font-weight: 700;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .set-value.on { background: var(--accent); color: #fff; }
  .set-row.layout-row { cursor: default; }
  .set-row.layout-row:hover { background: transparent; }
  .set-seg {
    position: relative;
    display: inline-grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 2px;
    background: rgba(255,255,255,0.05);
    border-radius: 9999px;
    flex-shrink: 0;
  }
  .seg-indicator {
    position: absolute;
    top: 2px; bottom: 2px; left: 2px;
    width: calc((100% - 4px) / 3);
    background: var(--accent);
    border-radius: 9999px;
    box-shadow: 0 2px 10px rgba(139, 92, 246, 0.45);
    transform: translateX(calc(var(--active-idx, 0) * 100%));
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0.24, 1);
    z-index: 0;
    pointer-events: none;
  }
  .seg-btn {
    position: relative; z-index: 1;
    padding: 5px 14px; border-radius: 9999px;
    background: transparent; color: var(--text2);
    font-size: 10px; font-weight: 700;
    transition: color 0.2s var(--ease-out);
    white-space: nowrap;
  }
  .seg-btn:hover { color: var(--text); }
  .seg-btn.active { color: #fff; }
  :global(.reader-root.bg-light) .set-seg { background: rgba(0,0,0,0.06); }
  :global(.reader-root.bg-light) .seg-btn { color: #6b7280; }
  :global(.reader-root.bg-light) .seg-btn:hover { color: #1f2233; }
  :global(.reader-root.bg-light) .seg-btn.active { color: #fff; }
  :global(.reader-root.bg-light) .set-menu {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(0,0,0,0.10);
  }
  :global(.reader-root.bg-light) .set-title { color: #1f2233; }
  :global(.reader-root.bg-light) .set-desc { color: #6b7280; }
  :global(.reader-root.bg-light) .set-value { background: rgba(0,0,0,0.06); color: #4b5263; }
  :global(.reader-root.bg-light) .set-row:hover { background: rgba(0,0,0,0.05); }
</style>
