<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { portal } from '../../shared/lib/portal';
  import { lookupTerm, type DictMatch } from '../../shared/lib/api';

  type Props = { bodyEl: HTMLElement | null };
  let { bodyEl }: Props = $props();

  let open = $state(false);
  let pos = $state({ top: 0, left: 0 });
  let term = $state('');
  let matches = $state<DictMatch[]>([]);
  let loading = $state(false);

  function positionFor(rect: DOMRect): { top: number; left: number } {
    const w = 340;
    const vw = window.innerWidth;
    let left = Math.round(rect.left + rect.width / 2 - w / 2);
    if (left + w + 16 > vw) left = vw - w - 16;
    if (left < 16) left = 16;
    return { top: Math.round(rect.bottom + 8), left };
  }

  async function lookup(word: string, rect: DOMRect) {
    term = word;
    pos = positionFor(rect);
    open = true;
    loading = true;
    matches = [];
    try {
      matches = await lookupTerm(word);
    } catch {
      matches = [];
    } finally {
      loading = false;
    }
  }

  // Browser's native double-click selection populates window.getSelection()
  // before our handler fires. Use that as the source of truth for the
  // looked-up word so we don't reinvent word boundaries.
  async function onDblClick(e: MouseEvent) {
    if (!bodyEl) return;
    // Ignore double-clicks inside an existing annotation popup or panel.
    const target = e.target as HTMLElement;
    if (target.closest('.nv-anno-menu, .anno-panel, .nv-dict-popup')) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const raw = sel.toString().trim();
    if (!raw) return;
    // Skip phrases — three-word cap matches "look up phrase" without
    // pulling in long sentences when the user shift-double-clicked.
    if (raw.split(/\s+/).length > 3) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    await lookup(raw, rect);
  }

  function onDocMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.nv-dict-popup')) return;
    open = false;
  }

  // Attach to bodyEl when it shows up; clean up on rebind.
  let attachedTo: HTMLElement | null = null;
  $effect(() => {
    if (attachedTo === bodyEl) return;
    if (attachedTo) attachedTo.removeEventListener('dblclick', onDblClick);
    attachedTo = bodyEl;
    if (bodyEl) bodyEl.addEventListener('dblclick', onDblClick);
  });
  onMount(() => { document.addEventListener('mousedown', onDocMouseDown); });
  onDestroy(() => {
    document.removeEventListener('mousedown', onDocMouseDown);
    if (attachedTo) attachedTo.removeEventListener('dblclick', onDblClick);
  });
</script>

{#if open}
  <div
    class="nv-dict-popup"
    style:top="{pos.top}px"
    style:left="{pos.left}px"
    use:portal
    role="dialog"
    aria-label="Dictionary"
    data-test="dict-popup"
  >
    <div class="dict-head">
      <span class="dict-term" data-test="dict-term">{term}</span>
      <button class="dict-close" onclick={() => (open = false)} aria-label="Close">×</button>
    </div>
    {#if loading}
      <div class="dict-empty">Looking up…</div>
    {:else if matches.length === 0}
      <div class="dict-empty" data-test="dict-empty">No match. Add a dictionary in Settings → Dictionaries.</div>
    {:else}
      <ul class="dict-list">
        {#each matches as m, i (i)}
          <li class="dict-row" data-test="dict-row">
            <div class="dict-chip">{m.dictionary}</div>
            <div class="dict-headword">{m.term}</div>
            <div class="dict-def">{m.definition}</div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .nv-dict-popup {
    position: fixed;
    z-index: 3000;
    width: 340px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 4px;
    background: color-mix(in srgb, var(--menu-bg) 92%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: 0 18px 40px -10px rgba(0,0,0,0.55);
    animation: pop 0.18s var(--ease-out);
  }
  @keyframes pop {
    from { opacity: 0; transform: translateY(-4px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .dict-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px 4px;
  }
  .dict-term { font-weight: 700; font-size: 14px; color: var(--text); }
  .dict-close {
    width: 24px; height: 24px; border-radius: 9999px;
    background: rgba(255,255,255,0.06); color: var(--text2);
    font-weight: 700;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .dict-close:hover { background: rgba(255,255,255,0.16); color: var(--text); }
  .dict-empty {
    padding: 16px 12px;
    color: var(--text3);
    font-size: 12px;
    text-align: center;
  }
  .dict-list { list-style: none; margin: 0; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
  .dict-row {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    display: flex; flex-direction: column; gap: 4px;
  }
  .dict-chip {
    align-self: flex-start;
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 6px; border-radius: 9999px;
    background: var(--accent-dim); color: var(--accent);
  }
  .dict-headword { font-size: 12px; font-weight: 600; color: var(--text); }
  .dict-def { font-size: 13px; line-height: 1.5; color: var(--text); }
</style>
