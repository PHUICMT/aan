<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { topSeriesWeek, type TopSeriesEntry } from '../../shared/lib/api';
  import { getCoverUrl } from '../../shared/lib/covers';
  import { openSeries } from '../../shared/lib/store.svelte';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import type { ReadingStats } from '../../shared/lib/types';

  type Props = { stats: ReadingStats };
  let { stats }: Props = $props();

  let topSeries = $state<TopSeriesEntry[]>([]);
  let topCovers = $state<Record<number, string>>({});

  onMount(async () => {
    try {
      const list = await topSeriesWeek(5);
      topSeries = list;
      for (const s of list) {
        void getCoverUrl(s.pid).then((url) => { if (url) topCovers[s.pid] = url; });
      }
    } catch {}
  });

  const maxSeconds = $derived(topSeries.length > 0 ? Math.max(...topSeries.map((s) => s.seconds)) : 1);

  function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const countMap = $derived.by(() => {
    const m = new Map<string, number>();
    for (const d of stats.daily) m.set(d.date, d.count);
    return m;
  });

  const currentStreak = $derived.by(() => {
    let n = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!countMap.has(ymd(today))) today.setDate(today.getDate() - 1);
    while (countMap.has(ymd(today))) {
      n++;
      today.setDate(today.getDate() - 1);
    }
    return n;
  });

  const longestStreak = $derived.by(() => {
    if (stats.daily.length === 0) return 0;
    let best = 1, cur = 1;
    let prev = new Date(stats.daily[0].date + 'T00:00:00');
    for (let i = 1; i < stats.daily.length; i++) {
      const d = new Date(stats.daily[i].date + 'T00:00:00');
      const diff = Math.round((d.getTime() - prev.getTime()) / 86_400_000);
      cur = diff === 1 ? cur + 1 : 1;
      if (cur > best) best = cur;
      prev = d;
    }
    return best;
  });

  const minToday = $derived(Math.round(stats.total_seconds_today / 60));
  const min7d = $derived(Math.round(stats.total_seconds_7d / 60));

  // 26-week heatmap (~6 months) — keeps cells legible in the home column.
  const WEEKS = 26;
  const grid = $derived.by(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS - 1) * 7 - today.getDay());
    const cells: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; future: boolean }[][] = [];
    const todayStr = ymd(today);
    for (let w = 0; w < WEEKS; w++) {
      const col: typeof cells[number] = [];
      for (let d = 0; d < 7; d++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + d);
        const key = ymd(cur);
        const c = countMap.get(key) ?? 0;
        const future = key > todayStr;
        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (c >= 10) level = 4;
        else if (c >= 6) level = 3;
        else if (c >= 3) level = 2;
        else if (c >= 1) level = 1;
        col.push({ date: key, count: c, level, future });
      }
      cells.push(col);
    }
    return cells;
  });

  // Emit a label only when the column's first row crosses a month boundary.
  const monthLabels = $derived.by(() => {
    const out: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < grid.length; i++) {
      const firstDate = new Date(grid[i][0].date + 'T00:00:00');
      const m = firstDate.getMonth();
      if (m !== lastMonth) {
        out.push({ col: i, label: firstDate.toLocaleDateString(undefined, { month: 'short' }) });
        lastMonth = m;
      }
    }
    return out;
  });

  function fmtDate(s: string): string {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
</script>

<section class="stats-board">
  <div class="kpis">
    <div class="kpi streak">
      <span class="kpi-icon">🔥</span>
      <div class="kpi-body">
        <div class="kpi-num">{currentStreak}<span class="kpi-unit">{t('home.stats.days')}</span></div>
        <div class="kpi-lbl">{t('home.stats.streak')} · {t('home.stats.longest').toLowerCase()} {longestStreak}</div>
      </div>
    </div>
    <div class="kpi">
      <div class="kpi-body">
        <div class="kpi-num">{minToday}<span class="kpi-unit">{t('home.stats.minutes')}</span> · {stats.today}<span class="kpi-unit">{t('home.stats.chapters').toLowerCase()}</span></div>
        <div class="kpi-lbl">{t('home.stats.today')}</div>
      </div>
    </div>
    <div class="kpi">
      <div class="kpi-body">
        <div class="kpi-num">{min7d}<span class="kpi-unit">{t('home.stats.minutes')}</span> · {stats.week}<span class="kpi-unit">{t('home.stats.chapters').toLowerCase()}</span></div>
        <div class="kpi-lbl">{t('home.stats.this_week')}</div>
      </div>
    </div>
  </div>

  <div class="activity-grid">
    <div class="heatmap-wrap">
      <div class="heatmap-head">
        <span class="title">{t('home.stats.activity')}</span>
        <div class="legend">
          <span class="legend-lbl">{t('home.stats.less')}</span>
          <span class="cell lv0"></span>
          <span class="cell lv1"></span>
          <span class="cell lv2"></span>
          <span class="cell lv3"></span>
          <span class="cell lv4"></span>
          <span class="legend-lbl">{t('home.stats.more')}</span>
        </div>
      </div>
      <div class="heatmap-inner">
        <div class="months">
          {#each monthLabels as ml (ml.col)}
            <span class="month" style:--col={ml.col}>{ml.label}</span>
          {/each}
        </div>
        <div class="heatmap">
          {#each grid as col, ci (ci)}
            <div class="col">
              {#each col as cell (cell.date)}
                <div
                  class="cell lv{cell.level}"
                  class:future={cell.future}
                  use:tooltip={cell.future ? '' : `${fmtDate(cell.date)} — ${cell.count}`}
                ></div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="top-wrap">
      <div class="heatmap-head">
        <span class="title">{t('home.stats.top_week')}</span>
      </div>
      {#if topSeries.length === 0}
        <div class="top-empty">{t('home.stats.top_empty')}</div>
      {:else}
        <ul class="top-list">
          {#each topSeries as s, i (s.pid)}
            {@const chip = TYPE_CHIP[s.kind] ?? TYPE_CHIP.manga}
            {@const mins = Math.max(1, Math.round(s.seconds / 60))}
            {@const pct = Math.max(6, Math.round((s.seconds / maxSeconds) * 100))}
            <li>
              <button class="top-item" onclick={() => openSeries(s.pid)} use:tooltip={s.name}>
                <span class="rank">{i + 1}</span>
                <div class="top-cover">
                  {#if topCovers[s.pid]}
                    <img src={topCovers[s.pid]} alt="" />
                  {:else}
                    <div class="top-cover-fb">{(s.name || '?').charAt(0)}</div>
                  {/if}
                </div>
                <div class="top-body">
                  <div class="top-head">
                    <span class="top-name" use:tooltip={s.name}>{s.name || `#${s.pid}`}</span>
                    <span class="top-mins">{mins}<span class="unit">m</span></span>
                  </div>
                  <div class="top-bar"><div class="top-bar-fill" style:width="{pct}%" style:background={chip.bg}></div></div>
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</section>

<style>
  .stats-board { margin-bottom: 24px; }

  .kpis {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 10px; margin-bottom: 14px;
  }
  .kpi {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 18px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 14px;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .kpi:hover { background: var(--surface2); }
  .kpi.streak {
    background: linear-gradient(135deg, var(--accent-dim), rgba(255,255,255,0.02));
    border-color: var(--accent);
  }
  .kpi-icon {
    font-size: 24px;
    line-height: 1;
    filter: drop-shadow(0 0 8px rgba(255, 140, 0, 0.5));
  }
  .kpi-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .kpi-num {
    font-size: 20px; font-weight: 700; color: var(--text);
    font-variant-numeric: tabular-nums; line-height: 1.1;
    white-space: nowrap;
  }
  .kpi.streak .kpi-num { color: var(--sidebar-hi); }
  .kpi-unit {
    font-size: 11px; font-weight: 500; color: var(--text3);
    margin-left: 3px; margin-right: 4px;
  }
  .kpi-lbl {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--text3);
  }
  @media (max-width: 720px) {
    .kpis { grid-template-columns: 1fr; }
  }

  .activity-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 10px;
  }
  @media (max-width: 1080px) {
    .activity-grid { grid-template-columns: 1fr; }
  }

  .heatmap-wrap {
    padding: 16px 18px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 14px;
    min-width: 0;
  }

  .top-wrap {
    padding: 16px 18px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 14px;
    min-width: 0;
    display: flex; flex-direction: column;
  }
  .top-empty {
    color: var(--text3); font-size: 11px;
    padding: 18px 4px;
    text-align: center;
  }
  .top-list {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 6px;
  }
  .top-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%;
    padding: 6px 8px;
    background: transparent;
    border-radius: 10px;
    text-align: left;
    transition:
      background 0.15s var(--ease-out),
      transform 0.18s var(--ease-out);
  }
  .top-item:hover {
    background: var(--hover-bg);
    transform: translateX(3px);
  }
  .top-cover { transition: border-color 0.15s var(--ease-out); }
  .top-item:hover .top-cover { border-color: var(--accent); }
  .top-cover img {
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .top-item:hover .top-cover img { transform: scale(1.08); }
  .rank {
    font-size: 14px; font-weight: 700; color: var(--text3);
    font-variant-numeric: tabular-nums;
    width: 16px; text-align: center;
    flex-shrink: 0;
  }
  .top-cover {
    flex-shrink: 0;
    width: 32px; height: 44px;
    border-radius: 5px; overflow: hidden;
    border: 1px solid var(--border); background: #14182a;
  }
  .top-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .top-cover { overflow: hidden; }
  .top-cover-fb {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .top-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .top-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
  }
  .top-name {
    font-size: 12px; font-weight: 600; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    min-width: 0;
    flex: 1;
  }
  .top-mins {
    font-size: 12px; font-weight: 700; color: var(--text2);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .top-mins .unit { font-size: 9px; font-weight: 500; color: var(--text3); margin-left: 1px; }
  .top-bar {
    height: 4px; border-radius: 9999px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
  }
  .top-bar-fill {
    height: 100%; border-radius: 9999px;
    transition: width 0.5s var(--ease-out);
  }
  .heatmap-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .heatmap-head .title {
    font-size: 11px; font-weight: 700; letter-spacing: 0.10em;
    text-transform: uppercase; color: var(--text3);
  }
  .legend {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; color: var(--text3);
  }
  .legend-lbl { padding: 0 4px; }

  .heatmap-inner {
    display: block;
    width: 100%;
    min-width: 0;
  }
  .months {
    position: relative;
    height: 14px; margin-bottom: 6px;
    font-size: 10px; color: var(--text3);
    width: 100%;
  }
  .month {
    position: absolute;
    top: 0;
    left: calc(var(--col) * (100% / 26));
    line-height: 14px;
    white-space: nowrap;
  }

  .heatmap {
    display: grid;
    grid-template-columns: repeat(26, minmax(0, 1fr));
    gap: 3px;
    width: 100%;
    /* Cap width so square cells stay ~22px on wide screens. */
    max-width: 660px;
  }
  .col { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .cell {
    aspect-ratio: 1;
    min-width: 0;
    border-radius: 3px;
    background: rgba(255,255,255,0.05);
    transition: transform 0.12s var(--ease-out);
  }
  .cell:hover { transform: scale(1.25); z-index: 1; }
  .cell.future { background: transparent; pointer-events: none; }
  .cell.lv0 { background: rgba(255,255,255,0.06); }
  .cell.lv1 { background: rgba(139, 92, 246, 0.40); }
  .cell.lv2 { background: rgba(139, 92, 246, 0.65); }
  .cell.lv3 { background: rgba(139, 92, 246, 0.85); }
  .cell.lv4 { background: var(--accent); box-shadow: 0 0 10px var(--accent-glow); }
  :global(:root[data-theme="light"]) .cell.lv0 { background: rgba(0,0,0,0.06); }
  :global(:root[data-theme="light"]) .cell.lv1 { background: rgba(124, 58, 237, 0.32); }
  :global(:root[data-theme="light"]) .cell.lv2 { background: rgba(124, 58, 237, 0.55); }
  :global(:root[data-theme="light"]) .cell.lv3 { background: rgba(124, 58, 237, 0.78); }
  :global(:root[data-theme="light"]) .cell.lv4 { background: var(--accent); }
  .legend .cell { width: 11px; height: 11px; border-radius: 2px; }
</style>
