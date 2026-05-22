<script lang="ts">
  import Icon from '../Icon.svelte';
  import { tooltip as tooltipAction } from '../../lib/tooltip';

  type Props = {
    icon: string;
    onclick?: (e: MouseEvent) => void;
    /** sm=22, md=26 (default), lg=30. Icon glyph auto-sized per pill. */
    size?: 'sm' | 'md' | 'lg';
    /** default = subtle pill with hover lift.
     *  ghost   = transparent until hover.
     *  danger  = red foreground + soft danger bg on hover.
     *  ok      = green foreground (confirm action).
     *  accent  = filled accent (primary action). */
    variant?: 'default' | 'ghost' | 'danger' | 'ok' | 'accent';
    tooltip?: string;
    ariaLabel?: string;
    disabled?: boolean;
    type?: 'button' | 'submit';
    testId?: string;
  };
  let {
    icon,
    onclick,
    size = 'md',
    variant = 'default',
    tooltip,
    ariaLabel,
    disabled = false,
    type = 'button',
    testId,
  }: Props = $props();

  const iconSize = $derived(size === 'sm' ? 10 : size === 'lg' ? 14 : 12);
</script>

<button
  {type}
  {disabled}
  onclick={onclick}
  aria-label={ariaLabel ?? tooltip}
  use:tooltipAction={tooltip ?? ''}
  data-test={testId}
  class="ib"
  class:size-sm={size === 'sm'}
  class:size-md={size === 'md'}
  class:size-lg={size === 'lg'}
  class:variant-default={variant === 'default'}
  class:variant-ghost={variant === 'ghost'}
  class:variant-danger={variant === 'danger'}
  class:variant-ok={variant === 'ok'}
  class:variant-accent={variant === 'accent'}
>
  <Icon name={icon} size={iconSize} />
</button>

<style>
  .ib {
    display: inline-grid;
    place-items: center;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    cursor: pointer;
    transition:
      background var(--dur-fast) var(--ease-out),
      color var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }
  .ib:active:not(:disabled) { transform: scale(0.94); }
  .ib:disabled { opacity: 0.5; cursor: not-allowed; }

  .size-sm { width: 22px; height: 22px; }
  .size-md { width: 26px; height: 26px; }
  .size-lg { width: 30px; height: 30px; }

  .variant-default {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text2);
  }
  .variant-default:hover:not(:disabled) {
    background: var(--accent-dim);
    color: var(--text);
    border-color: var(--accent);
  }

  .variant-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--text3);
  }
  .variant-ghost:hover:not(:disabled) {
    background: var(--hover-bg);
    color: var(--text);
  }

  .variant-danger {
    background: transparent;
    border-color: rgba(248, 113, 113, 0.4);
    color: var(--danger);
  }
  .variant-danger:hover:not(:disabled) {
    background: var(--danger-dim);
    border-color: var(--danger);
  }

  .variant-ok {
    background: transparent;
    border-color: rgba(74, 222, 128, 0.4);
    color: var(--success);
  }
  .variant-ok:hover:not(:disabled) {
    background: var(--success-dim);
    border-color: var(--success);
  }

  .variant-accent {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .variant-accent:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 4px 12px -4px var(--accent-glow);
  }
</style>
