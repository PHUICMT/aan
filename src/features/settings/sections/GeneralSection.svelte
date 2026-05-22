<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import SettingsRow from '../../../shared/components/ui/SettingsRow.svelte';
  import { AVAILABLE_LANGS, t } from '../../../shared/lib/i18n.svelte';
  import { app, setLang } from '../../../shared/lib/store.svelte';
  import type { Lang } from '../../../shared/lib/types';

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
  const visLang = $derived(matches(t('settings.lang.title'), t('settings.lang.desc')));
</script>

{#if !searching || visLang}
  <section class="group" class:open data-test="settings-section-general">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="settings" size={14} /></span>
      <h2>{t('settings.section.general')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        {#if visLang}
          <SettingsRow title={t('settings.lang.title')} desc={t('settings.lang.desc')}>
            <div class="lang-pick">
              {#each AVAILABLE_LANGS as l (l.id)}
                <button
                  class="lang"
                  class:active={app.lang === l.id}
                  onclick={() => setLang(l.id as Lang)}
                >
                  {#if app.lang === l.id}
                    <Icon name="check" size={12} />
                  {/if}
                  {l.label}
                </button>
              {/each}
            </div>
          </SettingsRow>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .lang-pick { display: inline-flex; gap: 6px; }
  .lang {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; border-radius: 9999px;
    border: 1px solid var(--border);
    background: transparent; color: var(--text2);
    font-size: 11px; font-weight: 500;
    will-change: transform;
    transition:
      background 0.18s var(--ease-out),
      border-color 0.18s var(--ease-out),
      color 0.18s var(--ease-out),
      box-shadow 0.28s var(--ease-out),
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .lang:hover:not(.active) {
    background: var(--surface2); color: var(--text);
    transform: translateY(-1px);
  }
  .lang:active:not(.active) { transform: scale(0.96); }
  .lang.active {
    background: var(--accent); border-color: var(--accent);
    color: #fff; font-weight: 600;
    box-shadow: 0 6px 16px -6px var(--accent-glow);
    transform: scale(1.08);
  }
</style>
