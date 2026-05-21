<script lang="ts">
  import { fade, scale, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../shared/components/Icon.svelte';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import type { SeriesCard } from '../../shared/lib/types';

  type Props = {
    picked: SeriesCard;
    covers: Record<number, string>;
    canReroll: boolean;
    onReroll: () => void;
    onOpen: () => void;
    onCancel: () => void;
  };

  let { picked, covers, canReroll, onReroll, onOpen, onCancel }: Props = $props();

  const chip = $derived(TYPE_CHIP[picked.type] ?? TYPE_CHIP.manga);

  function onPickKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    else if (e.key === 'Enter') { e.preventDefault(); onOpen(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onReroll(); }
  }
</script>

<svelte:window onkeydown={onPickKey} />

<div
  class="pick-overlay"
  role="dialog"
  aria-modal="true"
  aria-label={t('home.random.title')}
  onclick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
  onkeydown={(e) => { if (e.key === 'Escape') onCancel(); }}
  tabindex="-1"
  transition:fade={{ duration: 180, easing: cubicOut }}
  data-test="random-modal"
>
  <div
    class="pick-card"
    in:scale={{ duration: 220, start: 0.94, opacity: 0, easing: cubicOut }}
    out:scale={{ duration: 160, start: 0.96, opacity: 0, easing: cubicOut }}
  >
    <button class="pick-close" type="button" onclick={onCancel} aria-label={t('common.cancel')} data-test="random-cancel">
      <Icon name="x" size={12} />
    </button>
    <div class="pick-head">
      <Icon name="sync" size={14} />
      <span>{t('home.random.title')}</span>
    </div>
    <div class="pick-body-wrap">
      {#key picked.pid}
        <div
          class="pick-body"
          in:fly={{ y: 10, duration: 220, easing: cubicOut }}
          out:fade={{ duration: 120, easing: cubicOut }}
        >
          <div class="pick-cover">
            {#if covers[picked.pid]}
              <img src={covers[picked.pid]} alt={picked.name} />
            {:else}
              <div class="cover-fallback">{picked.name.charAt(0)}</div>
            {/if}
          </div>
          <div class="pick-info">
            <span class="chip-mini" style:background={chip.bg} style:color={chip.fg}>
              {t(chip.labelKey)}
            </span>
            <div class="pick-name" data-test="random-name">{picked.name}</div>
            {#if picked.chapter_count > 0}
              <div class="pick-meta">{picked.local_chapter_count} / {picked.chapter_count} {t('series.ch')}</div>
            {/if}
          </div>
        </div>
      {/key}
    </div>
    <div class="pick-actions">
      <button class="pick-btn ghost" type="button" onclick={onReroll} disabled={!canReroll} data-test="random-reroll">
        <Icon name="sync" size={12} />
        {t('home.random.reroll')}
      </button>
      <button class="pick-btn primary" type="button" onclick={onOpen} data-test="random-read">
        {t('home.random.read')}
      </button>
    </div>
  </div>
</div>

<style>
  .pick-overlay {
    position: fixed; inset: 0;
    background: var(--scrim-bg);
    backdrop-filter: var(--scrim-blur);
    -webkit-backdrop-filter: var(--scrim-blur);
    display: grid; place-items: center;
    z-index: 1000;
  }
  .pick-card {
    position: relative;
    width: min(420px, calc(100vw - 32px));
    background: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--panel-shadow);
  }
  .pick-close {
    position: absolute; top: 10px; right: 10px;
    width: 24px; height: 24px; border-radius: 6px;
    display: grid; place-items: center;
    background: transparent; color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .pick-close:hover { background: var(--hover-bg); color: var(--text); }
  .pick-head {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 14px;
  }
  .pick-body-wrap {
    display: grid;
    margin-bottom: 18px;
  }
  .pick-body-wrap > :global(*) {
    grid-area: 1 / 1;
  }
  .pick-body {
    display: flex; gap: 14px; align-items: stretch;
  }
  .pick-btn.ghost :global(svg) {
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .pick-btn.ghost:hover:not(:disabled) :global(svg) {
    transform: rotate(180deg);
  }
  .pick-cover {
    flex-shrink: 0;
    width: 90px; aspect-ratio: 160 / 220;
    border-radius: 8px; overflow: hidden;
    border: 1px solid var(--border); background: #14182a;
  }
  .pick-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-fallback {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .pick-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
  .chip-mini {
    align-self: flex-start;
    padding: 2px 8px; border-radius: 9999px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  }
  .pick-name {
    font-size: 15px; font-weight: 600; color: var(--text);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .pick-meta { font-size: 11px; color: var(--text2); font-variant-numeric: tabular-nums; }
  .pick-actions {
    display: flex; gap: 8px; justify-content: flex-end;
  }
  .pick-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 9999px;
    font-size: 12px; font-weight: 600;
    border: 1px solid var(--border);
    background: transparent; color: var(--text);
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .pick-btn.ghost:hover:not(:disabled) { background: var(--hover-bg); border-color: var(--accent); }
  .pick-btn.primary {
    background: var(--accent); color: #fff; border-color: var(--accent);
    box-shadow: 0 8px 20px -8px var(--accent-glow);
  }
  .pick-btn.primary:hover { filter: brightness(1.08); }
  .pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
