<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import SegmentedControl from '../../shared/components/ui/SegmentedControl.svelte';
  import Popover from '../../shared/components/ui/Popover.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { t } from '../../shared/lib/i18n.svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import BrightnessControls from './BrightnessControls.svelte';

  type View = 'paged' | 'continuous' | 'spread';
  type Dpage = 'off' | 'auto' | 'always';

  type Props = {
    view: View;
    bg: 'dark' | 'light';
    anim: boolean;
    rtl: boolean;
    dpage: Dpage;
    immersiveOn: boolean;
    pdfLoadMode: 'lazy' | 'eager';
    onSetView: (v: View) => void;
    onToggleBg: () => void;
    onToggleAnim: () => void;
    onToggleRtl: () => void;
    onCycleDpage: () => void;
    onToggleImmersive: () => void;
    onTogglePdfLoadMode: () => void;
  };
  let {
    view, bg, anim, rtl, dpage, immersiveOn, pdfLoadMode,
    onSetView, onToggleBg, onToggleAnim, onToggleRtl,
    onCycleDpage, onToggleImmersive, onTogglePdfLoadMode,
  }: Props = $props();
  // `mode` here drives the dpage row gating; continuous hides it.
  const mode = $derived(view === 'continuous' ? 'continuous' : 'paged');

  const viewOptions = $derived([
    { value: 'paged'      as const, label: t('reader.mode.paged'),      testId: 'reader-mode-paged' },
    { value: 'continuous' as const, label: t('reader.mode.continuous'), testId: 'reader-mode-continuous' },
    { value: 'spread'     as const, label: t('reader.mode.spread'),     testId: 'reader-mode-spread' },
  ]);

  let settingsOpen = $state(false);
  let settingsToggleEl = $state<HTMLButtonElement | null>(null);
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
  <Popover
    open={settingsOpen}
    anchor={settingsToggleEl}
    onClose={() => (settingsOpen = false)}
    gap={6}
    minWidth={320}
    testId="reader-settings-menu"
    >
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name={view === 'continuous' ? 'scroll' : view === 'spread' ? 'book_open' : 'file_text'} size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.mode.title')}</div>
          <div class="set-desc">{t('reader.mode.desc')}</div>
        </div>
        <SegmentedControl
          options={viewOptions}
          value={view}
          onChange={onSetView}
          size="sm"
          ariaLabel={t('reader.mode.title')}
        />
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
      {#if mode !== 'continuous'}
        <div transition:slide={{ duration: 220, easing: cubicOut }}>
          <button class="set-row" onclick={onCycleDpage} data-test="reader-dpage-cycle">
            <div class="set-icon"><Icon name="book_open" size={14} /></div>
            <div class="set-text">
              <div class="set-title">Double page</div>
              <div class="set-desc">Pair pages side-by-side (auto = only when both are portrait)</div>
            </div>
            <div class="set-value" class:on={dpage !== 'off'}>
              {dpage === 'off' ? 'Off' : dpage === 'auto' ? 'Auto' : 'Always'}
            </div>
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
      <button class="set-row" onclick={onTogglePdfLoadMode} data-test="reader-pdf-load-mode-toggle">
        <div class="set-icon"><Icon name="download" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('reader.pdf_load.title')}</div>
          <div class="set-desc">{t('reader.pdf_load.desc')}</div>
        </div>
        <div class="set-value" class:on={pdfLoadMode === 'lazy'}>
          {pdfLoadMode === 'lazy' ? t('reader.pdf_load.lazy') : t('reader.pdf_load.eager')}
        </div>
      </button>
      <div class="set-divider"></div>
      <div class="set-section-label">{t('reader.section.visibility')}</div>
      <div class="set-row brightness-row">
        <BrightnessControls />
      </div>
  </Popover>
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
  :global(.reader-root.bg-light) .set-title { color: #1f2233; }
  :global(.reader-root.bg-light) .set-desc { color: #6b7280; }
  :global(.reader-root.bg-light) .set-value { background: rgba(0,0,0,0.06); color: #4b5263; }
  :global(.reader-root.bg-light) .set-row:hover { background: rgba(0,0,0,0.05); }
</style>
