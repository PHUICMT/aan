<script lang="ts">
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import { ANIM } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';

  type Props = {
    state: 'loading' | 'empty' | 'error';
    error?: string | null;
    skeletonCount?: number;
    viewMode?: 'grid' | 'compact' | 'list';
  };

  let { state, error = null, skeletonCount = 0, viewMode = 'grid' }: Props = $props();
</script>

{#if state === 'error'}
  <div class="empty error">{t('library.error')}: {error}</div>
{:else if state === 'loading' && skeletonCount > 0}
  <div class="grid mode-{viewMode}">
    {#each Array(skeletonCount) as _, i}
      <div class="card-skel" style:--delay="{Math.min(i * ANIM.cardStaggerMs, ANIM.cardStaggerCap)}ms">
        <div class="card-skel-cover"><Shimmer radius={12} height="100%" /></div>
        <div class="card-skel-title"><Shimmer radius={4} height="100%" /></div>
        <div class="card-skel-meta"><Shimmer radius={4} height="100%" /></div>
      </div>
    {/each}
  </div>
{:else if state === 'empty'}
  <div class="empty" data-test="library-empty">
    <p>{t('library.empty')}</p>
    <p class="hint">{t('library.empty.hint')}</p>
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 18px;
  }
  .grid.mode-compact { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
  .card-skel {
    display: flex; flex-direction: column; gap: 6px;
    opacity: 0; transform: translateY(8px);
    animation: fade-in-up 0.5s var(--ease-out) forwards;
    animation-delay: var(--delay);
  }
  .card-skel-cover { aspect-ratio: 160 / 220; overflow: hidden; border-radius: 12px; }
  .card-skel-title { height: 14px; width: 75%; margin-top: 4px; overflow: hidden; border-radius: 4px; }
  .card-skel-meta  { height: 11px; width: 45%; overflow: hidden; border-radius: 4px; }
  .grid.mode-compact .card-skel-title { height: 12px; }
  .grid.mode-compact .card-skel-meta  { height: 10px; }
  .empty {
    padding: 60px 20px; text-align: center;
    color: var(--text2); font-size: 13px;
  }
  .empty.error { color: var(--danger); }
  .empty .hint { color: var(--text3); font-size: 11px; margin-top: 6px; }
</style>
