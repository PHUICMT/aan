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
  import { customFonts, refreshCustomFonts } from '../../../shared/lib/custom-fonts.svelte';
  import { installFont, removeCustomFont } from '../../../shared/lib/api';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';

  // CSS family value for a custom font — wrap in quotes so multi-word
  // names work, then fall back to a generic so legacy text doesn't go
  // to Times New Roman the instant the font fails to load.
  function cssFor(family: string): string {
    return `"${family.replace(/"/g, '\\"')}", system-ui, sans-serif`;
  }

  const customUiOptions = $derived(customFonts.list.map((f) => ({
    value: cssFor(f.family), label: `${f.family} (custom)`,
  })));
  const customNovelOptions = $derived(customFonts.list.map((f) => ({
    value: cssFor(f.family).replace('system-ui', 'serif'), label: `${f.family} (custom)`,
  })));
  const uiFontOptions = $derived([...UI_FONTS, ...customUiOptions]);
  const novelFontOptions = $derived([...NOVEL_FONTS, ...customNovelOptions]);

  let installing = $state(false);
  let installError = $state<string | null>(null);

  async function pickAndInstallFont() {
    installError = null;
    installing = true;
    try {
      const picked = await openDialog({
        multiple: false,
        filters: [{ name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
      });
      if (typeof picked !== 'string') return;
      await installFont(picked);
      await refreshCustomFonts();
    } catch (e) {
      installError = String(e);
    } finally {
      installing = false;
    }
  }

  async function removeFont(filename: string) {
    await removeCustomFont(filename);
    await refreshCustomFonts();
  }

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
          <div class="row" data-test="settings-row-font-ui">
            <div class="label">
              <div class="title">{t('settings.font.ui.title')}</div>
              <div class="desc">{t('settings.font.ui.desc')}</div>
            </div>
            <FontPicker options={uiFontOptions} value={app.fontUi} onChange={setFontUi} />
          </div>
        {/if}

        {#if visFontUiSize}
          <div class="row" data-test="settings-row-font-ui-size">
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
          <div class="row" data-test="settings-row-font-novel">
            <div class="label">
              <div class="title">{t('settings.font.novel.title')}</div>
              <div class="desc">{t('settings.font.novel.desc')}</div>
            </div>
            <FontPicker options={novelFontOptions} value={app.fontNovel} onChange={setFontNovel} />
          </div>
        {/if}

        {#if visFontNovelSize}
          <div class="row" data-test="settings-row-font-novel-size">
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
          <div class="row custom-fonts-row" data-test="custom-fonts">
            <div class="label">
              <div class="title">{t('settings.font.custom.title')}</div>
              <div class="desc">{t('settings.font.custom.desc')}</div>
            </div>
            <button
              type="button"
              class="install-btn"
              onclick={pickAndInstallFont}
              disabled={installing}
              data-test="custom-fonts-install"
            >
              <Icon name="plus" size={12} />
              {installing ? t('settings.font.custom.installing') : t('settings.font.custom.install')}
            </button>
          </div>
          {#if installError}
            <div class="font-error" transition:slide={{ duration: 180, easing: cubicOut }}>{installError}</div>
          {/if}
          {#if customFonts.list.length > 0}
            <ul class="font-list" data-test="custom-fonts-list">
              {#each customFonts.list as f (f.filename)}
                <li class="font-chip">
                  <span class="font-name" style:font-family={cssFor(f.family)}>{f.family}</span>
                  <span class="font-file">{f.filename}</span>
                  <button
                    type="button"
                    class="font-del"
                    onclick={() => removeFont(f.filename)}
                    aria-label="Remove {f.family}"
                    data-test="custom-font-remove"
                    data-font-filename={f.filename}
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
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

  .install-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 9999px;
    background: var(--accent-dim); color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    font-size: 12px; font-weight: 600;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.15s var(--ease-out);
  }
  .install-btn:hover:not(:disabled) { background: var(--accent); color: #fff; transform: translateY(-1px); }
  .install-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .font-list {
    list-style: none; margin: 8px 0 0; padding: 0;
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .font-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 6px 6px 12px; border-radius: 9999px;
    background: var(--hover-bg);
    border: 1px solid var(--border);
    transition: border-color 0.15s var(--ease-out);
  }
  .font-chip:hover { border-color: var(--accent); }
  .font-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .font-file { font-size: 10px; color: var(--text3); font-family: var(--font-mono); }
  .font-del {
    width: 24px; height: 24px; border-radius: 9999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent; color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .font-del:hover { background: rgba(239,68,68,0.18); color: #ef4444; }

  .font-error {
    margin-top: 8px; padding: 8px 12px;
    border-radius: 8px;
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.32);
    color: #fca5a5; font-size: 11px;
  }
</style>
