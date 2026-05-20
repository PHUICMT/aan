<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { portal, anchorBelow } from '../../shared/lib/portal';

  type Option = { value: string; label: string };
  type Props = {
    options: Option[];
    value: string;
    onChange: (v: string) => void;
  };
  let { options, value, onChange }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let pos = $state({ top: 0, left: 0, right: 0, width: 0 });
  const current = $derived(options.find((o) => o.value === value) ?? options[0]);

  $effect(() => {
    if (!open || !triggerEl) return;
    const a = anchorBelow(triggerEl, { gap: 6 });
    const r = triggerEl.getBoundingClientRect();
    pos = { top: a.top, left: a.left, right: a.right, width: Math.round(r.width) };
  });

  function pick(v: string) {
    onChange(v);
    open = false;
  }
  function onDocKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
  function closeOnOutside(node: HTMLElement, onOutside: () => void) {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (node.contains(target)) return;
      if (triggerEl && triggerEl.contains(target)) return;
      onOutside();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return { destroy() { document.removeEventListener('mousedown', handler); } };
  }
</script>

<svelte:window onkeydown={onDocKey} />

<div class="wrap">
  <button
    bind:this={triggerEl}
    type="button"
    class="trigger"
    class:open
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span class="label" style:font-family={current.value || undefined}>
      {current.value ? current.label : t(current.label)}
    </span>
    <span class="caret" class:flip={open}>
      <Icon name="chevron_down" size={12} />
    </span>
  </button>

  {#if open}
    <ul
      class="menu"
      role="listbox"
      style:top="{pos.top}px"
      style:left="{pos.left}px"
      style:width="{pos.width}px"
      use:portal
      use:closeOnOutside={() => (open = false)}
    >
      {#each options as o (o.value)}
        <li>
          <button
            class="item"
            class:active={o.value === value}
            role="option"
            aria-selected={o.value === value}
            onclick={() => pick(o.value)}
          >
            <span class="item-label" style:font-family={o.value || undefined}>
              {o.value ? o.label : t(o.label)}
            </span>
            {#if o.value === value}
              <span class="check"><Icon name="check" size={11} /></span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .wrap { position: relative; min-width: 240px; }
  .trigger {
    width: 100%;
    display: inline-flex; align-items: center; gap: 10px; justify-content: space-between;
    padding: 7px 8px 7px 14px;
    background: rgba(127, 127, 127, 0.06);
    border: 1px solid var(--border);
    border-radius: 9999px;
    color: var(--text);
    font-size: 12px; font-weight: 500;
    outline: none;
    cursor: pointer;
    transition:
      border-color 0.15s var(--ease-out),
      background 0.15s var(--ease-out);
  }
  .trigger:hover, .trigger.open { border-color: var(--accent); background: var(--hover-bg); }
  .label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left; }
  .caret {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 9999px;
    color: var(--text3);
    transition: transform 0.2s var(--ease-out), color 0.15s var(--ease-out);
  }
  .trigger:hover .caret, .trigger.open .caret { color: var(--text); }
  .caret.flip { transform: rotate(180deg); }

  .menu {
    position: fixed;
    max-height: 320px; overflow-y: auto;
    margin: 0; padding: 4px;
    list-style: none;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.45), 0 2px 8px -2px rgba(0,0,0,0.3);
    z-index: 2000;
    transform-origin: top center;
    animation: pop 0.18s var(--ease-out);
  }
  @keyframes pop {
    from { opacity: 0; transform: translateY(-4px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .item {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: transparent; color: var(--text2);
    font-size: 12px; font-weight: 500;
    text-align: left;
    transition: background 0.12s var(--ease-out), color 0.12s var(--ease-out);
  }
  .item:hover { background: var(--hover-bg); color: var(--text); }
  .item.active { color: var(--sidebar-hi); background: var(--accent-dim); }
  .item-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .check { display: inline-flex; color: var(--accent); }
</style>
