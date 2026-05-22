<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  type Props = {
    /** primary = filled accent · ghost = transparent w/ border · danger = filled red ·
     *  danger-ghost = transparent red · warn = filled amber · subtle = no border. */
    variant?: 'primary' | 'ghost' | 'danger' | 'danger-ghost' | 'warn' | 'subtle';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    iconAfter?: string;
    /** Stretches to fill the parent container. */
    block?: boolean;
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit';
    onclick?: (e: MouseEvent) => void;
    testId?: string;
    ariaLabel?: string;
    children?: Snippet;
  };
  let {
    variant = 'primary',
    size = 'md',
    icon,
    iconAfter,
    block = false,
    disabled = false,
    loading = false,
    type = 'button',
    onclick,
    testId,
    ariaLabel,
    children,
  }: Props = $props();

  const iconSize = $derived(size === 'sm' ? 11 : size === 'lg' ? 14 : 12);
</script>

<button
  {type}
  disabled={disabled || loading}
  onclick={onclick}
  aria-label={ariaLabel}
  aria-busy={loading}
  data-test={testId}
  class="btn"
  class:size-sm={size === 'sm'}
  class:size-md={size === 'md'}
  class:size-lg={size === 'lg'}
  class:block
  class:loading
  class:variant-primary={variant === 'primary'}
  class:variant-ghost={variant === 'ghost'}
  class:variant-danger={variant === 'danger'}
  class:variant-danger-ghost={variant === 'danger-ghost'}
  class:variant-warn={variant === 'warn'}
  class:variant-subtle={variant === 'subtle'}
>
  {#if loading}
    <span class="spinner" aria-hidden="true"></span>
  {:else if icon}
    <Icon name={icon} size={iconSize} />
  {/if}
  {#if children}<span class="lbl">{@render children()}</span>{/if}
  {#if iconAfter && !loading}<Icon name={iconAfter} size={iconSize} />{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
    transition:
      background var(--dur-fast) var(--ease-out),
      color var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out),
      filter var(--dur-fast) var(--ease-out);
    white-space: nowrap;
  }
  .btn:active:not(:disabled) { transform: scale(0.97); transition-duration: 60ms; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn.block { width: 100%; }

  .size-sm { padding: 5px 10px; font-size: 11px; }
  .size-md { padding: 7px 14px; font-size: 12.5px; }
  .size-lg { padding: 9px 18px; font-size: 13.5px; }

  /* Primary: accent fill */
  .variant-primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .variant-primary:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 4px 14px -4px var(--accent-glow);
  }

  /* Ghost: transparent with border */
  .variant-ghost {
    background: transparent;
    color: var(--text);
    border-color: var(--border);
  }
  .variant-ghost:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  /* Danger filled */
  .variant-danger {
    background: var(--danger);
    color: #fff;
    border-color: var(--danger);
  }
  .variant-danger:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 4px 14px -4px rgba(248,113,113,0.45);
  }

  /* Danger ghost: red text + soft red border */
  .variant-danger-ghost {
    background: transparent;
    color: var(--danger);
    border-color: rgba(248,113,113,0.4);
  }
  .variant-danger-ghost:hover:not(:disabled) {
    background: var(--danger-dim);
    border-color: var(--danger);
  }

  /* Warn: amber filled */
  .variant-warn {
    background: var(--warning);
    color: #1f2233;
    border-color: var(--warning);
  }
  .variant-warn:hover:not(:disabled) {
    filter: brightness(1.05);
    box-shadow: 0 4px 14px -4px rgba(251,191,36,0.45);
  }

  /* Subtle: chrome-only, used in tight rows */
  .variant-subtle {
    background: transparent;
    color: var(--text2);
    border-color: transparent;
  }
  .variant-subtle:hover:not(:disabled) {
    background: var(--hover-bg);
    color: var(--text);
  }

  .lbl { line-height: 1; }

  /* Spinner = single rotating quarter circle. */
  .spinner {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-top-color: transparent;
    animation: btn-spin 0.8s linear infinite;
  }
  @keyframes btn-spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .btn { transition: none; }
    .btn:active:not(:disabled) { transform: none; }
    .spinner { animation-duration: 1.4s; }
  }
</style>
