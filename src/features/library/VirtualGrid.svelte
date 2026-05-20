<!-- Windowed grid for large card lists. Renders only rows in viewport +
     a small buffer; auto-detects scrolling ancestor. -->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  type Props = {
    items: T[];
    /** Minimum width of a single card. Column count = floor((W + gap)/(minWidth + gap)). */
    cardMinWidth: number;
    /** Height-to-width ratio of just the cover area (e.g. 220/160 = 1.375). */
    cardAspect: number;
    /** Fixed pixel height of the meta strip below the cover (title + count). */
    extraHeight: number;
    /** Pixel gap between cards in both directions. */
    gap: number;
    /** Extra rows rendered above/below the viewport so scroll feels seamless. */
    bufferRows?: number;
    /** Snippet that renders one item — VirtualGrid only positions the wrapper. */
    item: Snippet<[T, number]>;
    /** Stable key — without it, scrolling remounts every visible card
     *  and re-fetches covers. */
    key: (it: T) => string | number;
  };

  let {
    items,
    cardMinWidth,
    cardAspect,
    extraHeight,
    gap,
    bufferRows = 4,
    item,
    key,
  }: Props = $props();

  let containerEl: HTMLDivElement | null = $state(null);
  let scrollEl: HTMLElement | null = null;
  let viewportH = $state(0);
  let scrollTop = $state(0);
  let containerW = $state(0);
  // Grid top edge offset within the scroll container; recomputed on resize.
  let containerTop = $state(0);

  const cols = $derived(
    containerW > 0 ? Math.max(1, Math.floor((containerW + gap) / (cardMinWidth + gap))) : 1,
  );
  const colWidth = $derived(cols > 0 ? (containerW - (cols - 1) * gap) / cols : 0);
  const cardH = $derived(colWidth * cardAspect + extraHeight);
  const rowH = $derived(cardH + gap);
  const totalRows = $derived(Math.ceil(items.length / cols));
  const totalH = $derived(totalRows > 0 ? totalRows * rowH - gap : 0);

  const scrollIntoGrid = $derived(Math.max(0, scrollTop - containerTop));
  const firstRow = $derived(
    Math.max(0, Math.floor(scrollIntoGrid / Math.max(1, rowH)) - bufferRows),
  );
  const lastRow = $derived(
    Math.min(
      totalRows - 1,
      Math.ceil((scrollIntoGrid + viewportH) / Math.max(1, rowH)) + bufferRows,
    ),
  );

  type Cell = { item: T; row: number; col: number; idx: number };
  const visible = $derived.by<Cell[]>(() => {
    const out: Cell[] = [];
    if (cols === 0 || items.length === 0) return out;
    for (let r = firstRow; r <= lastRow; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= items.length) break;
        out.push({ item: items[idx], row: r, col: c, idx });
      }
    }
    return out;
  });

  function recomputeOffset() {
    if (!containerEl || !scrollEl) return;
    const cRect = containerEl.getBoundingClientRect();
    const sRect = scrollEl.getBoundingClientRect();
    containerTop = cRect.top - sRect.top + scrollEl.scrollTop;
  }

  $effect(() => {
    if (!containerEl) return;
    // Find nearest scrolling ancestor.
    let el: HTMLElement | null = containerEl.parentElement;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll') break;
      el = el.parentElement;
    }
    scrollEl = el ?? document.documentElement;
    const sEl = scrollEl;

    const onScroll = () => {
      scrollTop = sEl.scrollTop;
    };
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.target === containerEl) containerW = e.contentRect.width;
        if (e.target === sEl) viewportH = e.contentRect.height;
      }
      recomputeOffset();
    });
    ro.observe(containerEl);
    if (sEl !== document.documentElement) ro.observe(sEl);

    sEl.addEventListener('scroll', onScroll, { passive: true });
    scrollTop = sEl.scrollTop;
    viewportH = sEl === document.documentElement ? window.innerHeight : sEl.clientHeight;
    containerW = containerEl.clientWidth;
    recomputeOffset();

    return () => {
      ro.disconnect();
      sEl.removeEventListener('scroll', onScroll);
    };
  });

  // Recompute offset when item count changes — stale scrollTop after a
  // shrink can push firstRow past totalRows.
  $effect(() => {
    void items.length;
    queueMicrotask(recomputeOffset);
  });
</script>

<div
  bind:this={containerEl}
  class="vgrid"
  style:height="{totalH}px"
>
  {#each visible as v (key(v.item))}
    <div
      class="vcell"
      style:top="{v.row * rowH}px"
      style:left="{v.col * (colWidth + gap)}px"
      style:width="{colWidth}px"
    >
      {@render item(v.item, v.idx)}
    </div>
  {/each}
</div>

<style>
  .vgrid {
    position: relative;
    width: 100%;
  }
  .vcell {
    position: absolute;
  }
</style>
