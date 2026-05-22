<script lang="ts">
  import Icon from '../../shared/components/Icon.svelte';
  import Popover from '../../shared/components/ui/Popover.svelte';
  import { t } from '../../shared/lib/i18n.svelte';

  type Option = { value: string; label: string };
  type Props = {
    options: Option[];
    value: string;
    onChange: (v: string) => void;
  };
  let { options, value, onChange }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  const current = $derived(options.find((o) => o.value === value) ?? options[0]);

  function pick(v: string) {
    onChange(v);
    open = false;
  }
</script>

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

  <Popover
    {open}
    anchor={triggerEl}
    onClose={() => (open = false)}
    align="left"
    matchTriggerWidth
    gap={6}
  >
    <ul class="menu" role="listbox">
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
  </Popover>
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
    max-height: 320px; overflow-y: auto;
    margin: 0; padding: 0;
    list-style: none;
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
