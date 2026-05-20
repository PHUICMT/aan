<script lang="ts">
  import Icon from './Icon.svelte';
  import { t } from '../lib/i18n.svelte';
  import { goBack } from '../lib/store.svelte';
</script>

<button class="back" onclick={goBack} data-test="back">
  <Icon name="chevron_left" size={14} />
  <span>{t('series.back')}</span>
</button>

<style>
  .back {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 12px 6px 8px;
    border-radius: 9999px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 12px; font-weight: 500;
    transition:
      background 0.15s var(--ease-out),
      color 0.15s var(--ease-out),
      transform 0.12s var(--ease-out);
  }
  .back:hover { background: var(--surface2); color: var(--text); }
  .back:active { transform: scale(0.96); }
  .back :global(svg) {
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .back:hover :global(svg) { transform: translateX(-3px); }
</style>
