// .svelte.ts so $effect.root is available — composables that use $effect
// can only be instantiated inside an effect root.
import { useLibraryFilters } from '../../../src/features/library/composables/useLibraryFilters.svelte';
import type { SeriesCard } from '../../../src/shared/lib/types';

export function mountFilters(seriesGetter: () => SeriesCard[]) {
  let filters!: ReturnType<typeof useLibraryFilters>;
  const cleanup = $effect.root(() => {
    filters = useLibraryFilters(seriesGetter);
  });
  return { filters, cleanup };
}
