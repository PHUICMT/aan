<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { app, setCloseToTrayLocal } from '../../../shared/lib/store.svelte';

  type Props = {
    open: boolean;
    searching: boolean;
    query: string;
    onToggle: () => void;
  };
  let { open, searching, query, onToggle }: Props = $props();

  const qLower = $derived(query.trim().toLowerCase());
  function matches(...keys: string[]): boolean {
    if (!qLower) return true;
    return keys.some((k) => k && k.toLowerCase().includes(qLower));
  }
  const visTray = $derived(matches(t('settings.tray.close_to_tray.title'), t('settings.tray.close_to_tray.desc')));
</script>

{#if visTray}
  <section class="group" class:open data-test="settings-section-tray">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="inbox" size={14} /></span>
      <h2>{t('settings.section.tray')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        <div class="row">
          <div class="label">
            <div class="title">{t('settings.tray.close_to_tray.title')}</div>
            <div class="desc">{t('settings.tray.close_to_tray.desc')}</div>
          </div>
          <button
            class="toggle"
            class:on={app.closeToTray}
            onclick={() => setCloseToTrayLocal(!app.closeToTray)}
            aria-pressed={app.closeToTray}
            aria-label={t('settings.tray.close_to_tray.title')}
            data-test="tray-toggle"
          ></button>
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .toggle {
    width: 38px; height: 22px;
    background: var(--surface2);
    border: none;
    border-radius: 11px;
    position: relative; cursor: pointer;
    transition: background 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
  }
  .toggle::after {
    content: ''; position: absolute;
    width: 18px; height: 18px;
    background: #fff; border-radius: 50%;
    top: 2px; left: 2px;
    transition: left 0.2s var(--ease-out);
  }
  .toggle.on {
    background: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  .toggle.on::after { left: 18px; }
</style>
