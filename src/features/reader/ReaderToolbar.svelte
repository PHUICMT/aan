<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import type { Snippet } from 'svelte';

  type Mode = 'continuous' | 'paged' | 'spread';

  type Props = {
    mode: Mode;
    modeLabel: string;
    modeIcon: string;
    fitLabel: string;
    fitIcon: string;
    currentPage: number;
    pageCount: number;
    visibleIndicesLen: number;
    jumpValue: string;
    zoom: number;
    onPrev: () => void;
    onNext: () => void;
    onSubmitJump: (e: SubmitEvent) => void;
    onJumpInput: (v: string) => void;
    onCycleMode: () => void;
    onCycleFit: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    children?: Snippet;
  };
  let {
    mode, modeLabel, modeIcon, fitLabel, fitIcon,
    currentPage, pageCount, visibleIndicesLen,
    jumpValue, zoom,
    onPrev, onNext, onSubmitJump, onJumpInput,
    onCycleMode, onCycleFit,
    onZoomIn, onZoomOut, onZoomReset,
    children,
  }: Props = $props();

</script>

<div class="reader-bar" data-test="reader-toolbar">
  <button class="nav" onclick={onPrev} use:tooltip={"Previous"} data-test="reader-prev">
    <Icon name="chevron_left" size={14} />
  </button>
  <form class="page-jump" onsubmit={onSubmitJump} data-test="reader-page">
    <input
      type="number"
      min="1"
      max={pageCount}
      value={jumpValue}
      oninput={(e) => onJumpInput((e.currentTarget as HTMLInputElement).value)}
      placeholder={visibleIndicesLen === 2 ? `${currentPage}-${currentPage + 1}` : String(currentPage)}
      use:tooltip={"Jump to page"}
      data-test="reader-jump-input"
    />
    <span class="of">/ {pageCount}</span>
  </form>
  <button class="nav" onclick={onNext} use:tooltip={"Next"} data-test="reader-next">
    <Icon name="chevron_right" size={14} />
  </button>
  <div class="sep"></div>
  <button class="mode" onclick={onCycleMode} use:tooltip={`${t('reader.mode.title')} — ${t('reader.mode.desc')}`} data-test="reader-mode-cycle">
    <Icon name={modeIcon} size={12} />
    {modeLabel}
  </button>
  <button class="mode" onclick={onCycleFit} use:tooltip={`${t('reader.fit.title')} — ${t('reader.fit.desc')}`} data-test="reader-fit-cycle">
    <Icon name={fitIcon} size={12} />
    {fitLabel}
  </button>
  <div class="zoom-ctrl" use:tooltip={`${t('reader.zoom.title')} — ${t('reader.zoom.desc')}`}>
    <button class="mode zoom-btn" onclick={onZoomOut} aria-label="Zoom out" data-test="reader-zoom-out">−</button>
    <button class="mode zoom-label" onclick={onZoomReset} use:tooltip={"Reset zoom"} data-test="reader-zoom-reset">{Math.round(zoom * 100)}%</button>
    <button class="mode zoom-btn" onclick={onZoomIn} aria-label="Zoom in" data-test="reader-zoom-in">+</button>
  </div>
  {#if children}{@render children()}{/if}
</div>

<style>
  .reader-bar {
    position: sticky; top: 0; z-index: 4;
    display: flex; align-items: center; justify-content: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(8, 14, 26, 0.78);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-soft);
    color: #cfd2dd;
    transition: transform 0.22s var(--ease-out), opacity 0.22s var(--ease-out);
  }
  :global(.reader-root.controls-hidden) .reader-bar {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }
  :global(.reader-root.bg-light) .reader-bar {
    background: rgba(255, 255, 255, 0.82);
    border-bottom-color: rgba(0,0,0,0.08);
    color: #1f2233;
  }
  :global(.reader-root.bg-light) .nav,
  :global(.reader-root.bg-light) .mode {
    background: rgba(0,0,0,0.04);
    color: #4b5263;
  }
  :global(.reader-root.bg-light) .nav:hover,
  :global(.reader-root.bg-light) .mode:hover { background: rgba(124,58,237,0.14); color: #1f2233; }
  :global(.reader-root.bg-light) .sep { background: rgba(0,0,0,0.12); }
  :global(.reader-root.bg-light) .page-jump { color: #4b5263; }
  :global(.reader-root.bg-light) .page-jump input {
    background: rgba(0,0,0,0.04);
    border-color: rgba(0,0,0,0.12);
    color: #1f2233;
  }
  :global(.reader-root.bg-light) .of { color: #6b7280; }
  .nav {
    width: 28px; height: 28px; border-radius: 8px;
    display: grid; place-items: center;
    color: var(--text2);
    background: rgba(255,255,255,0.04);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .nav:hover { background: var(--accent-dim); color: var(--text); }
  .mode {
    height: 26px; padding: 0 10px; border-radius: 6px;
    background: rgba(255,255,255,0.04); color: var(--text2);
    font-size: 11px; letter-spacing: 0.4px;
    display: inline-flex; align-items: center; gap: 6px;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .mode:hover { background: var(--accent-dim); color: var(--text); }
  .sep { width: 1px; height: 18px; background: var(--border); margin: 0 6px; }
  .page-jump {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px; color: var(--text2);
  }
  .page-jump input {
    width: 48px; padding: 4px 8px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font-mono); font-size: 11px;
    text-align: center;
    outline: none;
    transition: border-color 0.15s var(--ease-out);
  }
  .page-jump input:focus { border-color: var(--accent); }
  .page-jump input::-webkit-outer-spin-button,
  .page-jump input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .of { color: var(--text3); }
  .zoom-ctrl {
    display: inline-flex; align-items: center; gap: 2px;
    background: rgba(255,255,255,0.04);
    border-radius: 6px;
    padding: 0 2px;
  }
  .zoom-btn {
    width: 24px; height: 22px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px;
    line-height: 1;
  }
  .zoom-label {
    min-width: 44px; height: 22px; padding: 0 6px;
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--font-mono); font-size: 10px; font-weight: 600;
    line-height: 1;
  }
</style>
