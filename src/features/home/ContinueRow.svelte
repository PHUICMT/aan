<script lang="ts">
  import { tooltip } from '../../shared/lib/tooltip';
  import Icon from '../../shared/components/Icon.svelte';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { navigate } from '../../shared/lib/store.svelte';
  import type { RecentRead } from '../../shared/lib/types';

  type Props = {
    items: RecentRead[];
    covers: Record<number, string>;
    onResume: (it: RecentRead) => void;
  };

  let { items, covers, onResume }: Props = $props();

  function progressPct(it: RecentRead): number {
    if (!it.page_count) return 0;
    return Math.min(100, Math.round((it.last_page_read / it.page_count) * 100));
  }
</script>

<section class="block" data-test="home-continue">
  <div class="block-head">
    <h2>{t('home.continue')}</h2>
    <button class="more" onclick={() => navigate('history')} data-test="home-continue-see-all">
      {t('home.see_all')}
      <Icon name="chevron_right" size={11} />
    </button>
  </div>
  <div class="continue-row">
    {#each items as it (it.chapter_id + it.read_at)}
      {@const chip = TYPE_CHIP[it.kind] ?? TYPE_CHIP.manga}
      <button class="continue-card" onclick={() => onResume(it)} data-test="home-continue-card">
        <div class="cover-sm">
          {#if covers[it.pid]}
            <img src={covers[it.pid]} alt={it.series_name} />
          {:else}
            <div class="cover-fallback">{it.series_name.charAt(0)}</div>
          {/if}
          <div class="prog-overlay">
            <div class="prog-fill" style:width="{progressPct(it)}%"></div>
          </div>
        </div>
        <div class="continue-info">
          <span class="chip-mini" style:background={chip.bg} style:color={chip.fg}>
            {t(chip.labelKey)}
          </span>
          <div class="continue-name" use:tooltip={it.series_name}>{it.series_name}</div>
          <div class="continue-meta">{t('series.ch_no')} {it.chapter_no} · {it.last_page_read}/{it.page_count}</div>
        </div>
      </button>
    {/each}
  </div>
</section>

<style>
  .block { margin-bottom: 28px; }
  .block-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px;
  }
  .block h2 {
    font-size: 12px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
  }
  .more {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; color: var(--text2); font-weight: 500;
    transition: color 0.15s var(--ease-out);
  }
  .more:hover { color: var(--text); }
  .more :global(svg) {
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .more:hover :global(svg) { transform: translateX(3px); }

  .continue-row {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .continue-card {
    display: flex; gap: 10px; padding: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-align: left;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), transform 0.15s var(--ease-out);
  }
  .continue-card:hover { background: var(--surface2); border-color: var(--accent); transform: translateY(-2px); }
  .cover-sm {
    position: relative; width: 46px; height: 64px;
    border-radius: 8px; overflow: hidden;
    border: 1px solid var(--border); background: #14182a;
    flex-shrink: 0;
  }
  .cover-sm img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .continue-card:hover .cover-sm img { transform: scale(1.08); }
  .cover-fallback {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .prog-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: rgba(0,0,0,0.45);
  }
  .prog-fill { height: 100%; background: var(--accent); transition: width 0.3s var(--ease-out); }
  .continue-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .chip-mini {
    align-self: flex-start;
    padding: 1px 7px; border-radius: 9999px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  }
  .continue-name { font-size: 12px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .continue-meta { font-size: 11px; color: var(--text2); }
</style>
