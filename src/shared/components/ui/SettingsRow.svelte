<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    title: string;
    desc?: string;
    /** "warn" tints the desc amber — used for destructive settings. */
    descTone?: 'default' | 'warn';
    /** Dashed bottom border separates stacked rows (default true). Pass
     *  false for the last row of a section or when content is one-shot. */
    divider?: boolean;
    /** Right-side control: button, segmented control, segmented chips, etc. */
    children?: Snippet;
  };
  let {
    title,
    desc,
    descTone = 'default',
    divider = true,
    children,
  }: Props = $props();
</script>

<div class="row" class:no-divider={!divider}>
  <div class="label">
    <div class="title">{title}</div>
    {#if desc}<div class="desc" class:warn={descTone === 'warn'}>{desc}</div>{/if}
  </div>
  {#if children}{@render children()}{/if}
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px dashed var(--border-soft);
  }
  .row:last-of-type, .row.no-divider { border-bottom: none; }
  .label { min-width: 0; }
  .title { font-size: 13px; font-weight: 600; color: var(--text); }
  .desc { font-size: 11px; color: var(--text2); line-height: 1.4; margin-top: 2px; }
  .desc.warn { color: var(--warning); }
</style>
