// Library filter state, persistence, and derived filtered/counts.
// Factory pattern: pass a getter for the source series array so this
// stays decoupled from the fetch. Genre filtering reads the global
// `app` store directly (selectedGenres/genreCombo) — those mutate via
// dedicated store helpers and are not part of this composable's surface.

import { app } from '../../../shared/lib/store.svelte';
import type { SeriesCard } from '../../../shared/lib/types';

export type StatusFilter = 'all' | 'ongoing' | 'completed' | 'unknown';
export type DlFilter = 'all' | 'complete' | 'failed' | 'missing';
export type RsFilter = 'all' | 'none' | 'plan' | 'reading' | 'completed' | 'on_hold' | 'dropped';
export type ViewMode = 'grid' | 'compact' | 'list';
export type SortKey = 'updated' | 'name' | 'progress' | 'last_read';

export const STATUS_FILTERS: { id: StatusFilter; labelKey: string }[] = [
  { id: 'all',       labelKey: 'filter.all' },
  { id: 'ongoing',   labelKey: 'status.ongoing' },
  { id: 'completed', labelKey: 'status.completed' },
  { id: 'unknown',   labelKey: 'status.unknown' },
];

export const DL_FILTERS: { id: DlFilter; labelKey: string }[] = [
  { id: 'all',      labelKey: 'library.download.all' },
  { id: 'complete', labelKey: 'library.download.complete' },
  { id: 'missing',  labelKey: 'library.download.missing' },
];

export const RS_FILTERS: { id: RsFilter; labelKey: string }[] = [
  { id: 'all',       labelKey: 'filter.all' },
  { id: 'none',      labelKey: 'library.rs.none' },
  { id: 'plan',      labelKey: 'rs.plan' },
  { id: 'reading',   labelKey: 'rs.reading' },
  { id: 'completed', labelKey: 'rs.completed' },
  { id: 'on_hold',   labelKey: 'rs.on_hold' },
  { id: 'dropped',   labelKey: 'rs.dropped' },
];

export const SORT_KEYS: SortKey[] = ['updated', 'name', 'progress', 'last_read'];

export const SORT_LABELS: Record<SortKey, string> = {
  updated: 'library.sort.updated',
  last_read: 'library.sort.last_read',
  progress: 'library.sort.progress',
  name: 'library.sort.name',
};

function matchStatus(s: SeriesCard, f: StatusFilter): boolean {
  if (f === 'all') return true;
  if (f === 'ongoing')   return s.status === 1;
  if (f === 'completed') return s.status === 2;
  return s.status === 0 || s.status == null;
}

function matchDl(s: SeriesCard, f: DlFilter): boolean {
  if (f === 'all') return true;
  if (f === 'complete') return s.local_chapter_count >= s.chapter_count;
  return s.local_chapter_count < s.chapter_count;
}

function matchRs(s: SeriesCard, f: RsFilter): boolean {
  if (f === 'all') return true;
  if (f === 'none') return s.reading_status === null;
  return s.reading_status === f;
}

export function useLibraryFilters(seriesSrc: () => SeriesCard[]) {
  // ───── Initial loads from localStorage ─────
  const initStatus = ((): StatusFilter => {
    const v = localStorage.getItem('aan.lib.status');
    return v === 'ongoing' || v === 'completed' || v === 'unknown' ? v : 'all';
  })();
  const initDl = ((): DlFilter => {
    const v = localStorage.getItem('aan.lib.dl');
    return v === 'complete' || v === 'failed' || v === 'missing' ? v : 'all';
  })();
  const initRs = ((): RsFilter => {
    const v = localStorage.getItem('aan.lib.rs');
    return v === 'none' || v === 'plan' || v === 'reading' || v === 'completed'
      || v === 'on_hold' || v === 'dropped' ? v : 'all';
  })();
  const initView = ((): ViewMode => {
    const v = localStorage.getItem('aan.lib.view');
    return v === 'compact' || v === 'list' ? v : 'grid';
  })();
  const initSort = ((): SortKey => {
    const s = localStorage.getItem('aan.lib.sort');
    return (SORT_KEYS as string[]).includes(s ?? '') ? (s as SortKey) : 'updated';
  })();
  const initFiltersOpen = localStorage.getItem('aan.lib.filtersOpen') === '1';

  // ───── State ─────
  let typeFilter = $state<string>('all');
  let statusFilter = $state<StatusFilter>(initStatus);
  let dlFilter = $state<DlFilter>(initDl);
  let rsFilter = $state<RsFilter>(initRs);
  let viewMode = $state<ViewMode>(initView);
  let sortKey = $state<SortKey>(initSort);
  let filtersOpen = $state<boolean>(initFiltersOpen);
  let query = $state<string>('');

  // ───── Persistence ─────
  $effect(() => { try { localStorage.setItem('aan.lib.status', statusFilter); } catch {} });
  $effect(() => { try { localStorage.setItem('aan.lib.dl', dlFilter); } catch {} });
  $effect(() => { try { localStorage.setItem('aan.lib.rs', rsFilter); } catch {} });
  $effect(() => { try { localStorage.setItem('aan.lib.sort', sortKey); } catch {} });
  $effect(() => { try { localStorage.setItem('aan.lib.filtersOpen', filtersOpen ? '1' : '0'); } catch {} });
  // viewMode is persisted by setView() (so View Transitions can wrap the swap atomically).

  function setView(v: ViewMode) {
    const apply = () => {
      viewMode = v;
      try { localStorage.setItem('aan.lib.view', v); } catch {}
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  }

  // ───── Derived ─────
  const filtered = $derived.by(() => {
    const series = seriesSrc();
    const base = series.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (!matchStatus(s, statusFilter)) return false;
      if (!matchDl(s, dlFilter)) return false;
      if (!matchRs(s, rsFilter)) return false;
      if (app.selectedGenres.length > 0) {
        const tags = s.tags ?? [];
        const fn = app.genreCombo === 'and' ? 'every' : 'some';
        if (!app.selectedGenres[fn]((g) => tags.includes(g))) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.alias ?? '').toLowerCase().includes(q);
      }
      return true;
    });
    const sorted = base.slice();
    switch (sortKey) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'progress': {
        const pct = (s: SeriesCard) =>
          s.chapter_count > 0 ? s.local_chapter_count / s.chapter_count : 0;
        sorted.sort((a, b) => pct(b) - pct(a));
        break;
      }
      case 'last_read':
        sorted.sort((a, b) => (b.last_read_at ?? '').localeCompare(a.last_read_at ?? ''));
        break;
      case 'updated':
      default:
        sorted.sort((a, b) => (b.last_updated ?? '').localeCompare(a.last_updated ?? ''));
    }
    return sorted;
  });

  const activeFilterCount = $derived(
    app.selectedGenres.length
      + (statusFilter !== 'all' ? 1 : 0)
      + (dlFilter !== 'all' ? 1 : 0)
      + (rsFilter !== 'all' ? 1 : 0),
  );

  function countFor(id: string): number {
    const series = seriesSrc();
    if (id === 'all') return series.length;
    return series.filter((s) => s.type === id).length;
  }
  function statusCount(id: StatusFilter): number {
    const series = seriesSrc();
    if (id === 'all') return series.length;
    return series.filter((s) => matchStatus(s, id)).length;
  }
  function dlCount(id: DlFilter): number {
    const series = seriesSrc();
    if (id === 'all') return series.length;
    return series.filter((s) => matchDl(s, id)).length;
  }
  function rsCount(id: RsFilter): number {
    const series = seriesSrc();
    if (id === 'all') return series.length;
    return series.filter((s) => matchRs(s, id)).length;
  }

  return {
    // filter state
    get typeFilter() { return typeFilter; }, set typeFilter(v: string) { typeFilter = v; },
    get statusFilter() { return statusFilter; }, set statusFilter(v: StatusFilter) { statusFilter = v; },
    get dlFilter() { return dlFilter; }, set dlFilter(v: DlFilter) { dlFilter = v; },
    get rsFilter() { return rsFilter; }, set rsFilter(v: RsFilter) { rsFilter = v; },
    get query() { return query; }, set query(v: string) { query = v; },
    get viewMode() { return viewMode; },
    get sortKey() { return sortKey; }, set sortKey(v: SortKey) { sortKey = v; },
    get filtersOpen() { return filtersOpen; }, set filtersOpen(v: boolean) { filtersOpen = v; },
    // derived
    get filtered() { return filtered; },
    get activeFilterCount() { return activeFilterCount; },
    // actions
    setView,
    // counts
    countFor,
    statusCount,
    dlCount,
    rsCount,
  };
}

export type LibraryFilters = ReturnType<typeof useLibraryFilters>;
