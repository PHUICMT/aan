<script lang="ts">
  import { portal } from '../../shared/lib/portal';

  type Props = {
    currentPage: number;
    pageCount: number;
    rtl: boolean;
    tapCursor: 'left' | 'right' | null;
    cursorX: number;
    cursorY: number;
    cursorPressed: boolean;
    cursorDisabled: boolean;
    onPagedNext: () => void;
    onPagedPrev: () => void;
    onTapEnter: (side: 'left' | 'right', e: MouseEvent) => void;
    onTapMove: (e: MouseEvent) => void;
    onTapLeave: () => void;
    onTapDown: () => void;
    onTapUp: () => void;
    onTapWheel: (e: WheelEvent) => void;
  };
  let {
    currentPage, pageCount, rtl,
    tapCursor, cursorX, cursorY, cursorPressed, cursorDisabled,
    onPagedNext, onPagedPrev,
    onTapEnter, onTapMove, onTapLeave, onTapDown, onTapUp, onTapWheel,
  }: Props = $props();

  const leftDisabled = $derived(rtl ? currentPage >= pageCount : currentPage <= 1);
  const rightDisabled = $derived(rtl ? currentPage <= 1 : currentPage >= pageCount);
</script>

<button
  class="tap-zone left"
  onclick={() => { if (leftDisabled) return; rtl ? onPagedNext() : onPagedPrev(); }}
  onmouseenter={(e) => onTapEnter('left', e)}
  onmousemove={onTapMove}
  onmouseleave={onTapLeave}
  onmousedown={onTapDown}
  onmouseup={onTapUp}
  onwheel={onTapWheel}
  aria-label={rtl ? 'Next page' : 'Previous page'}
  aria-disabled={leftDisabled}
  tabindex="-1"
  data-test="reader-tap-left"
></button>
<button
  class="tap-zone right"
  onclick={() => { if (rightDisabled) return; rtl ? onPagedPrev() : onPagedNext(); }}
  onmouseenter={(e) => onTapEnter('right', e)}
  onmousemove={onTapMove}
  onmouseleave={onTapLeave}
  onmousedown={onTapDown}
  onmouseup={onTapUp}
  onwheel={onTapWheel}
  aria-label={rtl ? 'Previous page' : 'Next page'}
  aria-disabled={rightDisabled}
  tabindex="-1"
  data-test="reader-tap-right"
></button>
{#if tapCursor}
  <div
    class="tap-cursor"
    class:pressed={cursorPressed}
    class:cursor-disabled={cursorDisabled}
    style:left="{cursorX}px"
    style:top="{cursorY}px"
    use:portal
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {#if tapCursor === 'left'}
        {#if cursorDisabled}
          <line x1="7" y1="6" x2="7" y2="18" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"/>
          <polyline points="18 6 11 12 18 18" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>
        {:else}
          <polyline points="15 6 9 12 15 18" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>
        {/if}
      {:else}
        {#if cursorDisabled}
          <polyline points="6 6 13 12 6 18" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="17" y1="6" x2="17" y2="18" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"/>
        {:else}
          <polyline points="9 6 15 12 9 18" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>
        {/if}
      {/if}
    </svg>
  </div>
{/if}

<style>
  .tap-zone {
    position: fixed;
    top: 0; bottom: 0;
    width: 28%;
    background: transparent;
    border: none;
    z-index: 3;
    cursor: none;
  }
  .tap-zone.left { left: 0; }
  .tap-zone.right { right: 0; }
  .tap-zone:hover:not(:disabled) {
    background: linear-gradient(
      to var(--tap-grad, right),
      rgba(124, 58, 237, 0.05),
      transparent 60%
    );
  }
  .tap-zone.right:hover:not(:disabled) {
    background: linear-gradient(
      to left,
      rgba(124, 58, 237, 0.06),
      transparent 60%
    );
  }
  :global(.tap-cursor) {
    position: fixed;
    width: 44px; height: 44px;
    margin-left: -22px; margin-top: -22px;
    border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(255,255,255,0.20);
    border: 1.5px solid rgba(255,255,255,0.7);
    backdrop-filter: blur(14px) saturate(180%);
    -webkit-backdrop-filter: blur(14px) saturate(180%);
    box-shadow: 0 10px 28px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.35);
    color: var(--accent, #8b5cf6);
    pointer-events: none;
    z-index: 100;
    animation: tapCursorIn 0.22s cubic-bezier(0.32, 1.6, 0.4, 1);
    transition: transform 0.12s var(--ease-out), background 0.12s var(--ease-out), border-color 0.12s var(--ease-out);
    transform: scale(1);
  }
  :global(.tap-cursor svg) {
    filter:
      drop-shadow(0 0 2px rgba(255,255,255,0.9))
      drop-shadow(0 1px 2px rgba(0,0,0,0.55));
  }
  :global(.tap-cursor.pressed) {
    transform: scale(0.78);
    background: rgba(124, 58, 237, 0.30);
    border-color: rgba(255,255,255,0.95);
  }
  :global(.tap-cursor.cursor-disabled) {
    color: rgba(150, 150, 165, 0.85);
    background: rgba(255,255,255,0.10);
    border-color: rgba(255,255,255,0.35);
  }
  :global(.tap-cursor.cursor-disabled svg) {
    opacity: 0.55;
  }
  @keyframes -global-tapCursorIn {
    from { opacity: 0; transform: scale(0.4); }
    to   { opacity: 1; transform: scale(1); }
  }
</style>
