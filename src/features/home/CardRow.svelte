<script lang="ts">
  import { tooltip } from '../../shared/lib/tooltip';
  import Icon from '../../shared/components/Icon.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { navigate } from '../../shared/lib/store.svelte';
  import type { SeriesCard } from '../../shared/lib/types';

  type Props = {
    title: string;
    items: SeriesCard[];
    covers: Record<number, string>;
    onClick: (s: SeriesCard) => void;
    seeAllHref?: 'library' | 'favorites' | 'history';
    seeAllHint?: string;
    dimmed?: boolean;
  };

  let {
    title,
    items,
    covers,
    onClick,
    seeAllHref,
    seeAllHint,
    dimmed = false,
  }: Props = $props();
</script>

<section class="block">
  <div class="block-head">
    <h2>{title}</h2>
    {#if seeAllHref}
      <button class="more" onclick={() => navigate(seeAllHref)}>
        {t('home.see_all')}
        <Icon name="chevron_right" size={11} />
      </button>
    {:else if seeAllHint}
      <span class="more muted">{seeAllHint}</span>
    {/if}
  </div>
  <div class="fav-row">
    {#each items as s (s.pid)}
      <button
        class="fav-card"
        class:abandoned-card={dimmed}
        onclick={() => onClick(s)}
      >
        <div class="cover-fav">
          {#if covers[s.pid]}
            <img src={covers[s.pid]} alt={s.name} />
          {:else}
            <div class="cover-fallback">{s.name.charAt(0)}</div>
          {/if}
          {#if dimmed}
            <div class="abandoned-overlay"></div>
          {/if}
        </div>
        <div class="fav-name" use:tooltip={s.name}>{s.name}</div>
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
  .more.muted { color: var(--text3); }

  .fav-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
  .fav-card {
    display: flex; flex-direction: column; gap: 6px;
    width: 110px; flex-shrink: 0;
    background: transparent;
    text-align: left;
    transition: transform 0.15s var(--ease-out);
  }
  .fav-card:hover { transform: translateY(-2px); }
  .cover-fav {
    position: relative;
    width: 110px; aspect-ratio: 110/160;
    border-radius: 10px; overflow: hidden;
    border: 1px solid var(--border); background: #14182a;
    transition: border-color 0.15s var(--ease-out);
  }
  .cover-fav img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fav-card:hover .cover-fav {
    border-color: var(--accent);
    box-shadow: 0 14px 28px -18px var(--accent-glow);
  }
  .fav-card:hover .cover-fav img { transform: scale(1.06); }
  .fav-card .fav-name { transition: color 0.15s var(--ease-out); }
  .fav-card:hover .fav-name { color: var(--sidebar-hi); }
  .fav-name {
    font-size: 11px; color: var(--text); font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cover-fallback {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .abandoned-card .abandoned-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.55) 100%);
    pointer-events: none;
  }
  .abandoned-card { opacity: 0.85; transition: opacity 0.15s var(--ease-out); }
  .abandoned-card:hover { opacity: 1; }
</style>
