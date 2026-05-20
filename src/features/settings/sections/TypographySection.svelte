<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import {
    app,
    setFontUi,
    setFontUiSize,
    setFontNovel,
    setFontNovelSize,
  } from '../../../shared/lib/store.svelte';
  import { UI_FONTS, NOVEL_FONTS, FONT_SIZE_UI, FONT_SIZE_NOVEL } from '../../../shared/lib/constants';
  import FontPicker from '../FontPicker.svelte';

  type Props = {
    open: boolean;
    searching: boolean;
    query: string;
    onToggle: () => void;
  };
  let { open, searching, query, onToggle }: Props = $props();

  const qLower = $derived(query.trim().toLowerCase());
  function matches(...keys: string[]): boolean {
    if (!qLower) return true;
    return keys.some((k) => k && k.toLowerCase().includes(qLower));
  }
  const visFontUi = $derived(matches(t('settings.font.ui.title'), t('settings.font.ui.desc')));
  const visFontUiSize = $derived(matches(t('settings.font.ui.size')));
  const visFontNovel = $derived(matches(t('settings.font.novel.title'), t('settings.font.novel.desc')));
  const visFontNovelSize = $derived(matches(t('settings.font.novel.size')));
  const anyVis = $derived(visFontUi || visFontUiSize || visFontNovel || visFontNovelSize);
</script>

{#if !searching || anyVis}
  <section class="group" class:open data-test="settings-section-typography">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="type" size={14} /></span>
      <h2>{t('settings.section.typography')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        {#if visFontUi}
          <div class="row">
            <div class="label">
              <div class="title">{t('settings.font.ui.title')}</div>
              <div class="desc">{t('settings.font.ui.desc')}</div>
            </div>
            <FontPicker options={UI_FONTS} value={app.fontUi} onChange={setFontUi} />
          </div>
        {/if}

        {#if visFontUiSize}
          <div class="row">
            <div class="label">
              <div class="title">{t('settings.font.ui.size')}</div>
              <div class="desc">{app.fontUiSize}px</div>
            </div>
            <input
              type="range"
              class="slider"
              min={FONT_SIZE_UI.min}
              max={FONT_SIZE_UI.max}
              step="1"
              value={app.fontUiSize}
              oninput={(e) => setFontUiSize(Number((e.currentTarget as HTMLInputElement).value))}
            />
          </div>
        {/if}

        {#if visFontNovel}
          <div class="row">
            <div class="label">
              <div class="title">{t('settings.font.novel.title')}</div>
              <div class="desc">{t('settings.font.novel.desc')}</div>
            </div>
            <FontPicker options={NOVEL_FONTS} value={app.fontNovel} onChange={setFontNovel} />
          </div>
        {/if}

        {#if visFontNovelSize}
          <div class="row">
            <div class="label">
              <div class="title">{t('settings.font.novel.size')}</div>
              <div class="desc">{app.fontNovelSize}px</div>
            </div>
            <input
              type="range"
              class="slider"
              min={FONT_SIZE_NOVEL.min}
              max={FONT_SIZE_NOVEL.max}
              step="1"
              value={app.fontNovelSize}
              oninput={(e) => setFontNovelSize(Number((e.currentTarget as HTMLInputElement).value))}
            />
          </div>
        {/if}

        {#if !searching}
          <div class="preview" style:font-family={app.fontNovel || app.fontUi || undefined} style:font-size="{app.fontNovelSize}px">
            {t('settings.font.preview')}
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .preview {
    margin-top: 14px; padding: 16px 18px;
    border-radius: 10px;
    background: var(--hover-bg);
    border: 1px dashed var(--border);
    color: var(--text);
    line-height: 1.8;
  }
  .slider {
    width: 220px; height: 4px;
    appearance: none; -webkit-appearance: none;
    background: var(--surface2);
    border-radius: 9999px; outline: none;
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-dim);
    cursor: pointer;
    transition: transform 0.12s var(--ease-out);
  }
  .slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  .slider::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--accent); border: none;
    box-shadow: 0 0 0 4px var(--accent-dim);
    cursor: pointer;
  }
</style>
