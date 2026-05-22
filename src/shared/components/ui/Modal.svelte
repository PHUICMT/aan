<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Snippet } from 'svelte';
  import { portal } from '../../lib/portal';
  import IconButton from './IconButton.svelte';

  type Props = {
    open: boolean;
    onClose: () => void;
    title?: string;
    /** sm = 380px · md = 540px · lg = 720px. */
    size?: 'sm' | 'md' | 'lg';
    /** Hide the built-in close button (when caller wants custom header). */
    hideClose?: boolean;
    /** Click on backdrop closes. Disable for important confirmations. */
    closeOnScrim?: boolean;
    /** Escape closes. Disable when modal owns its own keyboard handler. */
    closeOnEsc?: boolean;
    testId?: string;
    /** Body content. */
    children?: Snippet;
    /** Custom header — replaces title bar entirely if provided. */
    header?: Snippet;
    /** Footer slot — pinned at bottom of the card. */
    footer?: Snippet;
  };
  let {
    open,
    onClose,
    title,
    size = 'md',
    hideClose = false,
    closeOnScrim = true,
    closeOnEsc = true,
    testId,
    children,
    header,
    footer,
  }: Props = $props();

  function onScrimClick(e: MouseEvent) {
    if (closeOnScrim && e.target === e.currentTarget) onClose();
  }
  function onKey(e: KeyboardEvent) {
    if (closeOnEsc && e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

{#if open}
  <div
    class="scrim"
    role="presentation"
    transition:fade={{ duration: 140 }}
    onclick={onScrimClick}
    use:portal
    data-test={testId ? `${testId}-scrim` : undefined}
  >
    <div
      class="card size-{size}"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      transition:scale={{ duration: 220, start: 0.94, opacity: 0, easing: cubicOut }}
      onkeydown={onKey}
      data-test={testId}
    >
      {#if header}
        {@render header()}
      {:else if title || !hideClose}
        <div class="card-head">
          {#if title}<h2 class="card-title">{title}</h2>{/if}
          {#if !hideClose}
            <div class="card-close"><IconButton icon="x" variant="ghost" size="sm" onclick={onClose} ariaLabel="Close" /></div>
          {/if}
        </div>
      {/if}
      {#if children}
        <div class="card-body">
          {@render children()}
        </div>
      {/if}
      {#if footer}
        <div class="card-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: var(--scrim-bg);
    display: grid;
    place-items: center;
    z-index: 1000;
  }
  .card {
    max-height: 88vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--panel-shadow);
  }
  .size-sm { width: min(380px, 92vw); }
  .size-md { width: min(540px, 92vw); }
  .size-lg { width: min(720px, 95vw); }

  .card-head {
    position: relative;
    display: flex;
    align-items: center;
    padding: 18px 22px 0;
  }
  .card-title {
    flex: 1;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }
  .card-close { position: absolute; top: 12px; right: 12px; }

  .card-body {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px;
  }
  .card-footer {
    padding: 14px 22px 18px;
    border-top: 1px solid var(--border-soft);
  }
</style>
