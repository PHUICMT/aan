<script lang="ts">
  // Test host. Owns a SeriesCard array prop and exposes the composable
  // back to the test via a bind:get prop. Runes-required code must live
  // inside a .svelte module — that's the whole point of this host.
  import { useLibraryFilters } from '../../../src/features/library/composables/useLibraryFilters.svelte';
  import type { SeriesCard } from '../../../src/shared/lib/types';

  let { series, expose }: { series: SeriesCard[]; expose: (lf: ReturnType<typeof useLibraryFilters>) => void } = $props();
  const lf = useLibraryFilters(() => series);
  expose(lf);
</script>

<div data-testid="host">
  <span data-testid="count">{lf.filtered.length}</span>
  <span data-testid="active">{lf.activeFilterCount}</span>
  <span data-testid="view">{lf.viewMode}</span>
  <span data-testid="sort">{lf.sortKey}</span>
</div>
