<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { navigate } from '../../shared/lib/store.svelte';

  type Props = {
    onPickRandom: () => void;
    randomBusy: boolean;
  };

  let { onPickRandom, randomBusy }: Props = $props();
</script>

<div class="quick-row">
  <button class="chip random" disabled={randomBusy} onclick={onPickRandom} data-test="home-pick-random">
    <Icon name="sync" size={12} />{t('home.quick.random')}
  </button>
  <button class="chip" onclick={() => navigate('favorites')} data-test="home-chip-favorites">
    <Icon name="heart" size={12} />{t('home.quick.favorites')}
  </button>
  <button class="chip" onclick={() => navigate('library')} data-test="home-chip-library">
    <Icon name="book" size={12} />{t('home.quick.library')}
  </button>
  <button class="chip" onclick={() => navigate('history')} data-test="home-chip-history">
    <Icon name="clock" size={12} />{t('home.quick.history')}
  </button>
</div>

<style>
  .quick-row {
    display: flex; gap: 8px; flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 9999px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 12px; font-weight: 500;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.12s var(--ease-out);
  }
  .chip:hover:not(:disabled) {
    background: var(--surface2);
    border-color: var(--accent);
    color: var(--text);
  }
  .chip:active:not(:disabled) { transform: scale(0.96); }
  .chip:disabled { opacity: 0.55; cursor: progress; }
  .chip :global(svg) {
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .chip:hover:not(:disabled) :global(svg) { transform: scale(1.15); }
  .chip.random:hover:not(:disabled) :global(svg) { transform: rotate(180deg); }
</style>
