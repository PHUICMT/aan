<script lang="ts">
  import { app, setReaderBrightness, setReaderWarmth } from '../../shared/lib/store.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  function resetAll() {
    setReaderBrightness(1);
    setReaderWarmth(0);
  }

  const brightnessPct = $derived(Math.round(app.readerBrightness * 100));
  const warmthPct = $derived(Math.round(app.readerWarmth * 100));
  // Fill 0-100 within each slider's range (brightness 30-100, warmth 0-60).
  const brightnessFill = $derived(Math.round(((brightnessPct - 30) / 70) * 100));
  const warmthFill = $derived(Math.round((warmthPct / 60) * 100));
</script>

<div class="brightness-controls">
  <div class="row">
    <label for="b-slider">{t('reader.brightness.title')}</label>
    <span class="val">{brightnessPct}%</span>
  </div>
  <input
    id="b-slider"
    type="range"
    class="slider"
    style:--p="{brightnessFill}%"
    min="30"
    max="100"
    step="1"
    value={brightnessPct}
    oninput={(e) => setReaderBrightness(Number((e.currentTarget as HTMLInputElement).value) / 100)}
  />

  <div class="row">
    <label for="w-slider">{t('reader.warmth.title')}</label>
    <span class="val">{warmthPct}%</span>
  </div>
  <input
    id="w-slider"
    type="range"
    class="slider warm"
    style:--p="{warmthFill}%"
    min="0"
    max="60"
    step="1"
    value={warmthPct}
    oninput={(e) => setReaderWarmth(Number((e.currentTarget as HTMLInputElement).value) / 100)}
  />

  {#if app.readerBrightness < 1 || app.readerWarmth > 0}
    <div transition:slide={{ duration: 200, easing: cubicOut }} class="reset-wrap">
      <button class="reset" type="button" onclick={resetAll}>{t('reader.brightness.reset')}</button>
    </div>
  {/if}
</div>

<style>
  .brightness-controls {
    display: flex; flex-direction: column; gap: 6px;
    padding: 4px 0;
    width: 100%;
    min-width: 220px;
  }
  .row {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 11px; color: var(--text2);
  }
  .row label { font-weight: 500; }
  .val { font-family: var(--font-mono); color: var(--text3); }

  .slider {
    width: 100%;
    height: 4px;
    appearance: none; -webkit-appearance: none;
    background: linear-gradient(90deg, var(--accent) 0%, var(--accent) var(--p, 0%), var(--surface2) var(--p, 0%), var(--surface2) 100%);
    border-radius: 9999px; outline: none;
    cursor: pointer;
    margin: 2px 0 8px;
  }
  .slider.warm {
    background: linear-gradient(90deg, #f59e0b 0%, #f59e0b var(--p, 0%), var(--surface2) var(--p, 0%), var(--surface2) 100%);
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
    cursor: pointer;
    transition: transform 0.12s var(--ease-out);
  }
  .slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  .slider::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--accent); border: none;
    box-shadow: 0 0 0 3px var(--accent-dim);
    cursor: pointer;
  }
  .slider.warm::-webkit-slider-thumb {
    background: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
  }
  .slider.warm::-moz-range-thumb {
    background: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
  }

  .reset-wrap {
    display: flex; align-items: flex-start;
    padding-top: 4px;
  }
  .reset {
    padding: 4px 10px; border-radius: 6px;
    background: var(--hover-bg); color: var(--text2);
    font-size: 10px; font-weight: 500;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .reset:hover { background: var(--surface2); color: var(--text); }
</style>
