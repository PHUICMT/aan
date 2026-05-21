<script lang="ts">
  import { onMount } from 'svelte';
  import { listRecentReads, listChapters } from '../../shared/lib/api';
  import { getCoverUrl } from '../../shared/lib/covers';
  import Icon from '../../shared/components/Icon.svelte';
  import Shimmer from '../../shared/components/Shimmer.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { openSeries, openReader, setReaderChapters } from '../../shared/lib/store.svelte';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import type { RecentRead } from '../../shared/lib/types';

  const SKELETON_KEY = 'aan.history.lastCount';
  const FILTER_KEY = 'aan.history.filter';
  const skeletonCount = (() => {
    const n = parseInt(localStorage.getItem(SKELETON_KEY) ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 0;
  })();

  type Filter = 'all' | 'manga' | 'comic' | 'novel' | 'original_novel';
  let items = $state<RecentRead[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let covers = $state<Record<number, string>>({});
  let filter = $state<Filter>(((): Filter => {
    const v = localStorage.getItem(FILTER_KEY);
    return v === 'manga' || v === 'comic' || v === 'novel' || v === 'original_novel' ? v : 'all';
  })());

  function setFilter(f: Filter) {
    filter = f;
    try { localStorage.setItem(FILTER_KEY, f); } catch {}
  }

  const counts = $derived.by(() => {
    const c: Record<string, number> = { all: items.length, manga: 0, comic: 0, novel: 0, original_novel: 0 };
    for (const it of items) {
      if (c[it.kind] !== undefined) c[it.kind]++;
    }
    return c;
  });
  const filtered = $derived(filter === 'all' ? items : items.filter((it) => it.kind === filter));

  onMount(async () => {
    try {
      items = await listRecentReads(100);
      try { localStorage.setItem(SKELETON_KEY, String(items.length)); } catch {}
      const seen = new Set<number>();
      for (const it of items) {
        if (seen.has(it.pid)) continue;
        seen.add(it.pid);
        void getCoverUrl(it.pid).then((url) => { if (url) covers[it.pid] = url; });
      }
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  async function resume(item: RecentRead) {
    try {
      const chs = await listChapters(item.pid);
      setReaderChapters(chs);
      const c = chs.find((x) => x.chapter_id === item.chapter_id);
      if (c) openReader(c);
    } catch {
      openSeries(item.pid);
    }
  }

  function progressPct(it: RecentRead): number {
    if (!it.page_count) return 0;
    return Math.min(100, Math.round((it.last_page_read / it.page_count) * 100));
  }

  function relTime(iso: string): string {
    if (!iso) return '';
    const t0 = new Date(iso.replace(' ', 'T') + 'Z').getTime();
    if (!Number.isFinite(t0)) return iso;
    const diff = Date.now() - t0;
    const m = Math.floor(diff / 60_000);
    if (m < 1) return t('history.just_now');
    if (m < 60) return t('history.min_ago').replace('{n}', String(m));
    const h = Math.floor(m / 60);
    if (h < 24) return t('history.hr_ago').replace('{n}', String(h));
    const d = Math.floor(h / 24);
    if (d < 30) return t('history.day_ago').replace('{n}', String(d));
    return iso.split(' ')[0] ?? iso;
  }
</script>

<div class="page" data-test="history-page">
  <header class="hero">
    <div>
      <h1>{t('history.title')}</h1>
      <p class="sub">{t('history.sub')}</p>
    </div>
  </header>

  {#if !loading && items.length > 0}
    <div class="tabs">
      <button class:active={filter === 'all'} onclick={() => setFilter('all')}>
        {t('filter.all')} <span class="ct">{counts.all}</span>
      </button>
      {#if counts.manga > 0}
        <button class:active={filter === 'manga'} onclick={() => setFilter('manga')}>
          {t('filter.manga')} <span class="ct">{counts.manga}</span>
        </button>
      {/if}
      {#if counts.comic > 0}
        <button class:active={filter === 'comic'} onclick={() => setFilter('comic')}>
          {t('filter.comic')} <span class="ct">{counts.comic}</span>
        </button>
      {/if}
      {#if counts.novel > 0}
        <button class:active={filter === 'novel'} onclick={() => setFilter('novel')}>
          {t('filter.novel')} <span class="ct">{counts.novel}</span>
        </button>
      {/if}
      {#if counts.original_novel > 0}
        <button class:active={filter === 'original_novel'} onclick={() => setFilter('original_novel')}>
          {t('filter.original')} <span class="ct">{counts.original_novel}</span>
        </button>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="empty error">{error}</div>
  {:else if loading && skeletonCount > 0}
    <div class="list">
      {#each Array(skeletonCount) as _}
        <div class="row-skel"><Shimmer radius={10} height="100%" /></div>
      {/each}
    </div>
  {:else if items.length === 0}
    <div class="empty">
      <p>{t('history.empty')}</p>
      <p class="hint">{t('history.empty.hint')}</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty">
      <p>{t('history.empty')}</p>
    </div>
  {:else}
    <div class="list">
      {#each filtered as it (it.chapter_id + it.read_at)}
        {@const chip = TYPE_CHIP[it.kind] ?? TYPE_CHIP.manga}
        <button class="row" onclick={() => resume(it)}>
          <div class="cover">
            {#if covers[it.pid]}
              <img src={covers[it.pid]} alt={it.series_name} />
            {:else}
              <div class="cover-fallback">{it.series_name.charAt(0)}</div>
            {/if}
          </div>
          <div class="info">
            <div class="line1">
              <span class="chip" style:background={chip.bg} style:color={chip.fg}>
                {t(chip.labelKey)}
              </span>
              <span class="name">{it.series_name}</span>
            </div>
            <div class="line2">
              {t('series.ch_no')} {it.chapter_no}{#if it.chapter_title} — {it.chapter_title}{/if}
            </div>
            <div class="prog">
              <div class="bar"><div class="fill" style:width="{progressPct(it)}%"></div></div>
              <span class="pct">{it.last_page_read} / {it.page_count}</span>
            </div>
          </div>
          <div class="meta">
            <span class="when">{relTime(it.read_at)}</span>
            <Icon name="chevron_right" size={14} />
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 28px 40px 40px; height: 100%; overflow-y: auto; }
  .hero { margin-bottom: 22px; }
  .hero h1 {
    font-size: 28px; font-weight: 700; letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
  }
  .sub { font-size: 12px; color: var(--text2); }

  .tabs {
    display: flex; gap: 6px; flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .tabs button {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 999px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text2);
    font-size: 11px; font-weight: 600;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .tabs button:hover { color: var(--text); background: var(--hover-bg); }
  .tabs button.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--text);
  }
  .tabs .ct {
    font-size: 10px; color: var(--text3);
    font-variant-numeric: tabular-nums;
  }
  .tabs button.active .ct { color: var(--accent); }

  .list { display: flex; flex-direction: column; gap: 8px; }
  .row-skel { height: 76px; border-radius: 12px; overflow: hidden; }
  .row {
    display: grid; grid-template-columns: 54px 1fr auto;
    gap: 14px; align-items: center;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
    text-align: left;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }
  .row:hover { background: var(--surface2); border-color: var(--accent); }
  .cover {
    width: 54px; height: 76px; border-radius: 8px; overflow: hidden;
    border: 1px solid var(--border); background: #14182a;
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-fallback {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .info { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .line1 { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .chip {
    display: inline-block; padding: 2px 8px; border-radius: 9999px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .name { font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .line2 { font-size: 11px; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .prog { display: flex; align-items: center; gap: 10px; }
  .bar {
    flex: 1; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.08); overflow: hidden;
  }
  .fill { height: 100%; background: var(--accent); transition: width 0.2s var(--ease-out); }
  .pct { font-size: 10px; color: var(--text3); font-variant-numeric: tabular-nums; }
  .meta {
    display: flex; align-items: center; gap: 8px;
    color: var(--text3);
  }
  .when { font-size: 11px; }

  .empty { padding: 60px 20px; text-align: center; color: var(--text2); font-size: 13px; }
  .empty.error { color: var(--danger); }
  .empty .hint { color: var(--text3); font-size: 11px; margin-top: 6px; }
</style>
