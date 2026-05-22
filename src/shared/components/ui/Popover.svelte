<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { portal, anchorBelow } from '../../lib/portal';

  type Props = {
    open: boolean;
    /** The trigger element (usually a button). Used to anchor the panel
     *  and to ignore outside-click events that hit it. Pass null if you
     *  use `at` for manual positioning. */
    anchor?: HTMLElement | null | undefined;
    /** Manual top/left position in viewport pixels — overrides anchor. */
    at?: { top: number; left: number } | null;
    /** Called when the user clicks outside or presses Esc. */
    onClose: () => void;
    /** Distance from trigger bottom to panel top. */
    gap?: number;
    /** Which edge of the trigger the panel aligns to. */
    align?: 'left' | 'right';
    /** Min-width of the panel pill (defaults to 240). */
    minWidth?: number;
    /** Match panel width to the trigger element exactly. Overrides minWidth. */
    matchTriggerWidth?: boolean;
    testId?: string;
    children?: Snippet;
  };
  let {
    open,
    anchor = null,
    at = null,
    onClose,
    gap = 8,
    align = 'right',
    minWidth = 240,
    matchTriggerWidth = false,
    testId,
    children,
  }: Props = $props();

  let pos = $state({ top: 0, left: 0, right: 0 });
  let triggerWidth = $state(0);
  $effect(() => {
    if (!open) return;
    if (at) {
      pos = { top: at.top, left: at.left, right: 0 };
    } else if (anchor) {
      pos = anchorBelow(anchor, { gap });
      triggerWidth = Math.round(anchor.getBoundingClientRect().width);
    }
  });

  function closeOnOutside(node: HTMLElement) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (anchor && anchor.contains(target)) return;
      onClose();
    }
    // Defer so the click that opened the popover doesn't immediately close it.
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  /** Spring-pop with origin biased to the anchor edge. */
  function popIn(_node: HTMLElement, { duration = 180 }: { duration?: number } = {}) {
    const originX = align === 'right' ? 'right' : 'left';
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => {
        const offset = (1 - t) * -4;
        const sc = 0.96 + t * 0.04;
        return `opacity: ${t}; transform: translateY(${offset}px) scale(${sc}); transform-origin: top ${originX};`;
      },
    };
  }
</script>

{#if open}
  <div
    class="popover"
    role="menu"
    tabindex="-1"
    use:portal
    use:closeOnOutside
    onkeydown={onKey}
    transition:popIn
    style:top="{pos.top}px"
    style:left={align === 'left' ? `${pos.left}px` : 'auto'}
    style:right={align === 'right' ? `${pos.right}px` : 'auto'}
    style:width={matchTriggerWidth ? `${triggerWidth}px` : null}
    style:min-width={matchTriggerWidth ? null : `${minWidth}px`}
    data-test={testId}
  >
    {#if children}{@render children()}{/if}
  </div>
{/if}

<style>
  .popover {
    position: fixed;
    z-index: 100;
    background: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--panel-shadow);
    padding: 6px;
    color: var(--text);
  }
  /* @supports fallback for browsers without backdrop-filter (Mica fallback). */
  @supports not (backdrop-filter: blur(1px)) {
    .popover { background: var(--menu-bg); }
  }
</style>
