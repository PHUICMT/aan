<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import SegmentedControl from '../../shared/components/ui/SegmentedControl.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { portal, anchorBelow } from '../../shared/lib/portal';
  import { t } from '../../shared/lib/i18n.svelte';
  import { cubicOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';
  import BrightnessControls from './BrightnessControls.svelte';
  import {
    app,
    setFontNovelSize,
    setNovelLayout,
    setNovelTheme,
    setNovelLineHeight,
    setNovelMaxWidth,
    setNovelSpread,
    saveOverrideForCurrentSeries,
    clearOverrideForCurrentSeries,
    LINE_HEIGHT_MIN, LINE_HEIGHT_MAX, MAX_WIDTH_MIN, MAX_WIDTH_MAX,
    type NovelLayout, type NovelTheme,
  } from '../../shared/lib/store.svelte';

  const overrideActive = $derived(
    app.novelOverridePid != null && app.novelOverridePid === app.readerChapter?.pid,
  );

  const layoutOptions = $derived([
    { value: 'scroll' as const, label: t('novel.layout.scroll'), testId: 'novel-layout-scroll' },
    { value: 'paged'  as const, label: t('novel.layout.paged'),  testId: 'novel-layout-paged' },
  ]);
  const canOverride = $derived(app.readerChapter?.pid != null);

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

  const THEMES: { id: NovelTheme; labelKey: string; swatch: string }[] = [
    { id: 'light', labelKey: 'novel.theme.light', swatch: '#f3f1ea' },
    { id: 'sepia', labelKey: 'novel.theme.sepia', swatch: '#f1e7d0' },
    { id: 'dark',  labelKey: 'novel.theme.dark',  swatch: '#161826' },
    { id: 'black', labelKey: 'novel.theme.black', swatch: '#000000' },
  ];

  let open = $state(false);
  let toggleEl = $state<HTMLButtonElement | null>(null);
  let pos = $state({ top: 0, right: 16 });
  $effect(() => {
    if (!open || !toggleEl) return;
    pos = anchorBelow(toggleEl, { gap: 6 });
  });
  function closeOnOutside(node: HTMLElement, onOutside: () => void) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (toggleEl && toggleEl.contains(target)) return;
      onOutside();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }
</script>

<div class="set-wrap">
  <button
    bind:this={toggleEl}
    class="set-toggle"
    class:on={open}
    onclick={() => (open = !open)}
    use:tooltip={t('reader.settings')}
    aria-label={t('reader.settings')}
    data-test="novel-settings-toggle"
  >
    <Icon name="settings" size={13} />
  </button>
  {#if open}
    <div
      class="set-scrim"
      use:portal
      aria-hidden="true"
    ></div>
    <div
      class="set-menu"
      role="menu"
      style:top="{pos.top}px"
      style:right="{pos.right}px"
      transition:popMenu
      use:portal
      use:closeOnOutside={() => (open = false)}
      data-test="novel-settings-menu"
    >
      <!-- Layout -->
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name={app.novelLayout === 'paged' ? 'file_text' : 'scroll'} size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('novel.layout.title')}</div>
          <div class="set-desc">{t('novel.layout.desc')}</div>
        </div>
        <SegmentedControl
          options={layoutOptions}
          value={app.novelLayout}
          onChange={(v) => setNovelLayout(v as NovelLayout)}
          size="sm"
          ariaLabel={t('novel.layout.title')}
        />
      </div>

      {#if app.novelLayout === 'paged'}
        <div transition:slide={{ duration: 220, easing: cubicOut }}>
          <button class="set-row" onclick={() => setNovelSpread(!app.novelSpread)} data-test="novel-spread-toggle">
            <div class="set-icon"><Icon name="book_open" size={14} /></div>
            <div class="set-text">
              <div class="set-title">{t('novel.spread.title')}</div>
              <div class="set-desc">{t('novel.spread.desc')}</div>
            </div>
            <div class="set-value" class:on={app.novelSpread}>{app.novelSpread ? t('reader.anim.on') : t('reader.anim.off')}</div>
          </button>
        </div>
      {/if}

      <!-- Theme swatches -->
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name="palette" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('novel.theme.title')}</div>
          <div class="set-desc">{t('novel.theme.desc')}</div>
        </div>
        <div class="swatches">
          {#each THEMES as th (th.id)}
            <button
              class="swatch"
              class:active={app.novelTheme === th.id}
              style:background={th.swatch}
              onclick={() => setNovelTheme(th.id)}
              aria-label={t(th.labelKey)}
              use:tooltip={t(th.labelKey)}
              data-test="novel-theme-{th.id}"
            ></button>
          {/each}
        </div>
      </div>

      <!-- Font size -->
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name="type" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('novel.font_size.title')}</div>
          <div class="set-desc">{app.fontNovelSize}px</div>
        </div>
        <div class="step-ctl">
          <button onclick={() => setFontNovelSize(app.fontNovelSize - 1)} aria-label="smaller" data-test="novel-font-smaller">A−</button>
          <button onclick={() => setFontNovelSize(app.fontNovelSize + 1)} aria-label="larger" data-test="novel-font-larger">A+</button>
        </div>
      </div>

      <!-- Line height -->
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name="layout_list" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('novel.line_height.title')}</div>
          <div class="set-desc">{app.novelLineHeight.toFixed(1)}</div>
        </div>
        <div class="step-ctl">
          <button onclick={() => setNovelLineHeight(app.novelLineHeight - 0.1)} disabled={app.novelLineHeight <= LINE_HEIGHT_MIN + 0.001} aria-label="tighter" data-test="novel-lineheight-dec">−</button>
          <button onclick={() => setNovelLineHeight(app.novelLineHeight + 0.1)} disabled={app.novelLineHeight >= LINE_HEIGHT_MAX - 0.001} aria-label="looser" data-test="novel-lineheight-inc">+</button>
        </div>
      </div>

      <!-- Max width -->
      <div class="set-row layout-row">
        <div class="set-icon"><Icon name="layout_grid" size={14} /></div>
        <div class="set-text">
          <div class="set-title">{t('novel.max_width.title')}</div>
          <div class="set-desc">{app.novelMaxWidth}px</div>
        </div>
        <div class="step-ctl">
          <button onclick={() => setNovelMaxWidth(app.novelMaxWidth - 40)} disabled={app.novelMaxWidth <= MAX_WIDTH_MIN} aria-label="narrower" data-test="novel-maxwidth-dec">−</button>
          <button onclick={() => setNovelMaxWidth(app.novelMaxWidth + 40)} disabled={app.novelMaxWidth >= MAX_WIDTH_MAX} aria-label="wider" data-test="novel-maxwidth-inc">+</button>
        </div>
      </div>

      <div class="set-divider"></div>
      <div class="set-section-label">{t('reader.section.visibility')}</div>
      <div class="set-row brightness-row">
        <BrightnessControls />
      </div>
      {#if canOverride}
        <div class="set-divider"></div>
        <div class="set-section-label">{t('novel.override.section')}</div>
        <div class="override-row" data-test="novel-override-row" data-override-active={overrideActive ? '1' : '0'}>
          <div class="ov-text">
            {overrideActive ? t('novel.override.active') : t('novel.override.inactive')}
          </div>
          {#if overrideActive}
            <button class="ov-btn ov-reset" onclick={() => clearOverrideForCurrentSeries()} data-test="novel-override-clear">
              {t('novel.override.clear')}
            </button>
          {:else}
            <button class="ov-btn ov-save" onclick={() => saveOverrideForCurrentSeries()} data-test="novel-override-save">
              {t('novel.override.save')}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .set-wrap { position: relative; display: inline-flex; }
  .set-toggle {
    height: 26px; width: 28px; border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04); color: var(--text2);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .set-toggle:hover { background: var(--accent-dim); color: var(--text); }
  .set-toggle.on { background: var(--accent-dim); color: var(--text); }
  :global(.novel-root.bg-light) .set-toggle { background: rgba(0,0,0,0.04); color: #4b5263; }
  :global(.novel-root.bg-light) .set-toggle:hover { background: rgba(124,58,237,0.14); color: #1f2233; }

  .set-scrim {
    position: fixed; inset: 0;
    background: var(--scrim-bg);
    z-index: 1999;
    /* Visual-only — clicks pass through; closeOnOutside already handles
       outside dismiss via document-level mousedown. */
    pointer-events: none;
    animation: setScrimIn 180ms var(--ease-out) both;
  }
  @keyframes setScrimIn { from { opacity: 0; } to { opacity: 1; } }
  .set-menu {
    position: fixed;
    min-width: 340px;
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
  .set-row {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    text-align: left;
  }
  .set-row.brightness-row { display: block; padding: 4px 12px 8px; }
  .set-row.layout-row { cursor: default; }
  .set-icon { display: grid; place-items: center; color: var(--text2); }
  .set-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .set-title { font-size: 12px; font-weight: 600; color: var(--text); }
  .set-desc { font-size: 10px; color: var(--text); line-height: 1.4; opacity: 0.72; }
  .set-divider { height: 1px; background: var(--border-soft); margin: 4px 6px; }
  .set-section-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
    padding: 4px 12px 2px;
  }


  .swatches { display: inline-flex; gap: 6px; }
  .swatch {
    width: 22px; height: 22px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.18);
    transition: transform 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
    cursor: pointer;
  }
  .swatch:hover { transform: scale(1.1); }
  .swatch.active {
    box-shadow: 0 0 0 2px var(--accent), 0 0 0 4px rgba(139, 92, 246, 0.3);
  }

  .step-ctl { display: inline-flex; gap: 4px; }
  .step-ctl button {
    width: 28px; height: 26px; border-radius: 6px;
    font-size: 11px; font-weight: 700;
    background: rgba(255,255,255,0.06); color: var(--text2);
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .step-ctl button:hover:not(:disabled) { background: var(--accent-dim); color: var(--text); }
  .step-ctl button:disabled { opacity: 0.35; cursor: not-allowed; }

  .set-row:not(.layout-row):not(.brightness-row) {
    cursor: pointer;
    transition: background 0.12s var(--ease-out);
  }
  .set-row:not(.layout-row):not(.brightness-row):hover { background: var(--hover-bg); }
  .set-value {
    padding: 3px 10px; border-radius: 9999px;
    background: rgba(255,255,255,0.12); color: var(--text);
    font-size: 10px; font-weight: 700;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .set-value.on { background: var(--accent); color: #fff; }

  .override-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 6px 12px 8px;
  }
  .ov-text { font-size: 11px; color: var(--text2); line-height: 1.4; }
  .ov-btn {
    padding: 6px 12px; border-radius: 9999px;
    font-size: 11px; font-weight: 700;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .ov-save { background: var(--accent-dim); color: var(--accent); }
  .ov-save:hover { background: var(--accent); color: #fff; }
  .ov-reset { background: rgba(239,68,68,0.14); color: #fca5a5; }
  .ov-reset:hover { background: rgba(239,68,68,0.32); color: #fff; }

  :global(.novel-root.bg-light) .set-menu {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(0,0,0,0.10);
  }
  :global(.novel-root.bg-light) .set-title { color: #1f2233; }
  :global(.novel-root.bg-light) .set-desc { color: #6b7280; }
  :global(.novel-root.bg-light) .step-ctl button { background: rgba(0,0,0,0.06); color: #4b5263; }
</style>
