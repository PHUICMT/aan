<script lang="ts">
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import type { ChapterMatch } from '../../shared/lib/types';

  type Props = {
    matches: ChapterMatch[];
    pending: boolean;
    onOpen: (m: ChapterMatch) => void;
  };

  let { matches, pending, onOpen }: Props = $props();
</script>

<section class="ch-results">
  <div class="ch-head">
    <span class="ch-title-lbl">{t('library.chapter_matches')}</span>
    {#if matches.length > 0}
      <span class="ch-count">{matches.length}</span>
    {/if}
  </div>
  {#if pending && matches.length === 0}
    <div class="ch-skel">
      {#each Array(3) as _, i (i)}
        <Shimmer radius={8} height="40px" />
      {/each}
    </div>
  {:else}
    <ul class="ch-list">
      {#each matches as m (m.chapter_id)}
        {@const chip = TYPE_CHIP[m.kind] ?? TYPE_CHIP.manga}
        <li>
          <button class="ch-row" onclick={() => onOpen(m)}>
            <span class="ch-chip" style:background={chip.bg} style:color={chip.fg}>
              {t(chip.labelKey)}
            </span>
            <span class="ch-name">{m.series_name}</span>
            <span class="ch-sep">·</span>
            <span class="ch-no">{t('series.ch_no')} {m.chapter_no}</span>
            {#if m.chapter_title}
              <span class="ch-tt">— {m.chapter_title}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .ch-results {
    margin: -4px 0 22px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .ch-head {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 10px;
  }
  .ch-title-lbl {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
  }
  .ch-count {
    font-size: 10px; padding: 1px 7px; border-radius: 9999px;
    background: var(--accent-dim); color: var(--sidebar-hi); font-weight: 700;
  }
  .ch-skel { display: flex; flex-direction: column; gap: 6px; }
  .ch-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .ch-row {
    width: 100%;
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: 8px;
    background: transparent;
    text-align: left;
    color: var(--text2);
    font-size: 11px;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .ch-row:hover { background: var(--hover-bg); color: var(--text); }
  .ch-chip {
    padding: 1px 7px; border-radius: 9999px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .ch-name { font-weight: 600; color: var(--text); }
  .ch-sep { color: var(--text3); }
  .ch-no { font-family: var(--font-mono); color: var(--text3); }
  .ch-tt { color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; }
</style>
