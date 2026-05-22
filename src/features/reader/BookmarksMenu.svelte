<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import Popover from '../../shared/components/ui/Popover.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
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
  <Popover
    open={bookmarksOpen && bookmarks.length > 0}
    anchor={bmListToggleEl}
    onClose={() => (bookmarksOpen = false)}
    gap={6}
    minWidth={220}
  >
    <ul class="bm-menu" role="listbox">
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
  </Popover>
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
  .bm-menu {
    max-height: 320px; overflow-y: auto;
    margin: 0; padding: 0;
    list-style: none;
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
