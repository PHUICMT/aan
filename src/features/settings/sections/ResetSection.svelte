<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import SettingsRow from '../../../shared/components/ui/SettingsRow.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';

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
  const visReset = $derived(matches(t('settings.reset.title'), t('settings.reset.desc')));

  let confirmReset = $state(false);
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;
  function askReset() {
    confirmReset = true;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => (confirmReset = false), 5000);
  }
  function cancelReset() {
    confirmReset = false;
    if (confirmTimer) clearTimeout(confirmTimer);
  }
  function doReset() {
    if (confirmTimer) clearTimeout(confirmTimer);
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('aan.')) localStorage.removeItem(k);
      }
    } catch {}
    location.reload();
  }
</script>

{#if !searching || visReset}
  <section class="group" class:open data-test="settings-section-reset">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="rotate_ccw" size={14} /></span>
      <h2>{t('settings.section.reset')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        {#if visReset}
          <SettingsRow title={t('settings.reset.title')} desc={t('settings.reset.desc')}>
            {#if confirmReset}
              <span class="confirm-wrap">
                <button class="action danger" onclick={doReset} data-test="reset-confirm">
                  <Icon name="check" size={12} />
                  {t('settings.reset.confirm')}
                </button>
                <button class="confirm-no" onclick={cancelReset} aria-label={t('common.cancel')} data-test="reset-cancel">
                  <Icon name="x" size={11} />
                </button>
              </span>
            {:else}
              <button class="action warn" onclick={askReset} data-test="reset-ask">
                <Icon name="sync" size={12} />
                {t('settings.reset.cta')}
              </button>
            {/if}
          </SettingsRow>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .action {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 9999px;
    background: var(--accent-dim); color: var(--sidebar-hi);
    border: 1px solid var(--accent);
    font-size: 11px; font-weight: 600;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .action:hover:not(:disabled) { background: var(--accent); color: #fff; }
  .action.warn {
    background: rgba(251, 191, 36, 0.12); color: var(--warning);
    border-color: var(--warning);
  }
  .action.warn:hover { background: var(--warning); color: #1f2230; }
  .action.danger {
    background: var(--danger-dim); color: var(--danger);
    border-color: var(--danger);
  }
  .action.danger:hover { background: var(--danger); color: #fff; }
  .confirm-wrap {
    display: inline-flex; align-items: center; gap: 6px;
    animation: fade-in-up 0.18s var(--ease-out);
  }
  .confirm-no {
    width: 24px; height: 24px; border-radius: 50%;
    display: grid; place-items: center;
    background: var(--hover-bg); color: var(--text2);
    transition: background 0.15s var(--ease-out);
  }
  .confirm-no:hover { background: var(--surface2); color: var(--text); }
  .action:disabled { opacity: 0.6; cursor: progress; }
</style>
