<script lang="ts" generics="T extends string">
  import Icon from '../Icon.svelte';
  import { tooltip as tooltipAction } from '../../lib/tooltip';

  type Option = {
    value: T;
    label?: string;
    icon?: string;
    iconSize?: number;
    tooltip?: string;
    testId?: string;
  };

  type Props = {
    options: Option[];
    value: T;
    onChange: (v: T) => void;
    /** `pill` = rounded text segments with sliding accent indicator (default).
     *  `icons` = compact icon-only toolbar segment, single accent on active. */
    variant?: 'pill' | 'icons';
    /** Compact vertical sizing for in-toolbar use. */
    size?: 'sm' | 'md';
    ariaLabel?: string;
    /** Mirrors as a data-attribute so feature CSS can target the group. */
    testId?: string;
  };
  let {
    options,
    value,
    onChange,
    variant = 'pill',
    size = 'md',
    ariaLabel,
    testId,
  }: Props = $props();

  const activeIdx = $derived(Math.max(0, options.findIndex((o) => o.value === value)));
</script>

<div
  class="seg"
  class:variant-pill={variant === 'pill'}
  class:variant-icons={variant === 'icons'}
  class:size-sm={size === 'sm'}
  role="radiogroup"
  aria-label={ariaLabel}
  style:--seg-count={options.length}
  style:--seg-idx={activeIdx}
  data-test={testId}
>
  {#if variant === 'pill'}
    <span class="seg-indicator" aria-hidden="true"></span>
  {/if}
  {#each options as opt (opt.value)}
    {@const isActive = opt.value === value}
    <button
      type="button"
      class="seg-btn"
      class:active={isActive}
      role="radio"
      aria-checked={isActive}
      aria-label={opt.tooltip ?? opt.label}
      onclick={() => { if (!isActive) onChange(opt.value); }}
      use:tooltipAction={opt.tooltip ?? ''}
      data-test={opt.testId}
    >
      {#if opt.icon}<Icon name={opt.icon} size={opt.iconSize ?? 13} />{/if}
      {#if opt.label}<span class="seg-label">{opt.label}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .seg {
    position: relative;
    display: inline-grid;
    padding: 2px;
    border-radius: 9999px;
    background: rgba(127, 127, 127, 0.10);
    flex-shrink: 0;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
  }
  .variant-icons {
    background: transparent;
    border: 1px solid var(--border);
    padding: 2px;
    gap: 2px;
  }
  .seg-indicator {
    position: absolute;
    top: 2px; bottom: 2px; left: 2px;
    width: calc((100% - 4px) / var(--seg-count, 2));
    background: var(--accent);
    border-radius: 9999px;
    box-shadow: 0 4px 12px -4px var(--accent-glow);
    transform: translateX(calc(var(--seg-idx, 0) * 100%));
    transition: transform var(--dur-slow) var(--ease-spring);
    z-index: 0;
    pointer-events: none;
  }
  .seg-btn {
    position: relative;
    z-index: 1;
    padding: 5px 14px;
    border-radius: 9999px;
    background: transparent;
    color: var(--text2);
    font-size: 11px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    white-space: nowrap;
    transition: color var(--dur-mid) var(--ease-out), background var(--dur-fast) var(--ease-out);
  }
  .size-sm .seg-btn { padding: 4px 10px; font-size: 10px; }
  .seg-btn:hover:not(.active) { color: var(--text); }
  .seg-btn.active { color: #fff; }

  /* Icon-only variant: each button is its own pill, no shared indicator. */
  .variant-icons .seg-btn {
    padding: 5px 9px;
    color: var(--text3);
  }
  .variant-icons .seg-btn:hover:not(.active) {
    color: var(--text);
    background: var(--hover-bg);
  }
  .variant-icons .seg-btn.active {
    background: var(--accent);
    color: #fff;
  }
</style>
