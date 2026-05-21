<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { portal, anchorBelow } from '../../shared/lib/portal';
  import type { Bookmark } from '../../shared/lib/types';

  type Props = {
    bookmarks: Bookmark[];
    currentPage: number;
    currentBookmarked: boolean;
    onToggleHere: () => void;
    onJump: (page: number) => void;
    onDelete: (id: number) => void;
  };
  let { bookmarks, currentPage, currentBookmarked, onToggleHere, onJump, onDelete }: Props = $props();

  let bookmarksOpen = $state(false);
  let bmListToggleEl = $state<HTMLButtonElement | null>(null);
  let bmPos = $state({ top: 0, right: 16 });
  $effect(() => {
    if (!bookmarksOpen || !bmListToggleEl) return;
    bmPos = anchorBelow(bmListToggleEl, { gap: 6 });
  });
  function closeBmOnOutside(node: HTMLElement, onOutside: () => void) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (bmListToggleEl && bmListToggleEl.contains(target)) return;
      onOutside();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }
</script>

<div class="bm-wrap">
  <button
    class="mode bm-toggle"
    class:on={currentBookmarked}
    onclick={onToggleHere}
    use:tooltip={currentBookmarked ? 'Remove bookmark' : 'Bookmark current page'}
    data-test="reader-bm-toggle"
  >
    <Icon name={currentBookmarked ? 'bookmark' : 'bookmark_plus'} size={12} />
  </button>
  {#if bookmarks.length > 0}
    <button
      bind:this={bmListToggleEl}
      class="mode bm-list-toggle"
      onclick={() => (bookmarksOpen = !bookmarksOpen)}
      use:tooltip={"Show bookmarks"}
      data-test="reader-bm-list-toggle"
    >
      {bookmarks.length}
      <Icon name="chevron_down" size={10} />
    </button>
  {/if}
  {#if bookmarksOpen && bookmarks.length > 0}
    <div
      class="bm-scrim"
      use:portal
      aria-hidden="true"
    ></div>
    <ul
      class="bm-menu"
      role="listbox"
      style:top="{bmPos.top}px"
      style:right="{bmPos.right}px"
      use:portal
      use:closeBmOnOutside={() => (bookmarksOpen = false)}
    >
      {#each bookmarks as bm (bm.id)}
        <li>
          <button
            class="bm-item"
            class:active={bm.page === currentPage}
            onclick={() => { onJump(bm.page); bookmarksOpen = false; }}
            data-test={`reader-bm-item-${bm.id}`}
          >
            <span class="bm-page">p.{bm.page}</span>
            {#if bm.note}
              <span class="bm-note">{bm.note}</span>
            {/if}
          </button>
          <button
            class="bm-del"
            onclick={(e) => { e.stopPropagation(); onDelete(bm.id); }}
            use:tooltip={"Delete bookmark"}
            aria-label="Delete bookmark"
            data-test={`reader-bm-delete-${bm.id}`}
          >
            <Icon name="trash" size={11} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .bm-wrap { position: relative; display: inline-flex; gap: 4px; }
  .mode {
    height: 26px; padding: 0 10px; border-radius: 6px;
    background: rgba(255,255,255,0.04); color: var(--text2);
    font-size: 11px; letter-spacing: 0.4px;
    display: inline-flex; align-items: center; gap: 6px;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .mode:hover { background: var(--accent-dim); color: var(--text); }
  .bm-toggle.on { color: #fbbf24; background: rgba(251,191,36,0.16); }
  :global(.reader-root.bg-light) .bm-toggle.on { color: #92400e; background: rgba(251,191,36,0.22); }
  :global(.reader-root.bg-light) .mode { background: rgba(0,0,0,0.04); color: #4b5263; }
  :global(.reader-root.bg-light) .mode:hover { background: rgba(124,58,237,0.14); color: #1f2233; }
  .bm-list-toggle {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: var(--font-mono); font-size: 10px;
  }
  .bm-scrim {
    position: fixed; inset: 0;
    background: var(--scrim-bg);
    z-index: 1999;
    pointer-events: none;
    animation: bm-fade 180ms var(--ease-out) both;
  }
  @keyframes bm-fade { from { opacity: 0; } to { opacity: 1; } }
  .bm-menu {
    position: fixed;
    min-width: 220px; max-height: 320px; overflow-y: auto;
    margin: 0; padding: 4px;
    list-style: none;
    background: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: var(--panel-shadow);
    z-index: 2000;
    animation: bm-pop 0.18s var(--ease-out);
  }
  @keyframes bm-pop {
    from { opacity: 0; transform: translateY(-4px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .bm-menu li { display: flex; align-items: center; gap: 4px; }
  .bm-item {
    flex: 1;
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    background: transparent; color: var(--text2);
    font-size: 11px; text-align: left;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .bm-item:hover { background: var(--hover-bg); color: var(--text); }
  .bm-item.active { background: var(--accent-dim); color: var(--text); }
  .bm-page { font-family: var(--font-mono); font-weight: 700; color: #fbbf24; }
  :global(:root[data-theme="light"]) .bm-page { color: #92400e; }
  .bm-note { color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bm-del {
    width: 26px; height: 26px;
    display: grid; place-items: center;
    border-radius: 6px;
    color: var(--text3); background: transparent;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .bm-del:hover { background: var(--danger-dim); color: var(--danger); }
</style>
