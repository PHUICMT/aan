<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import SegmentedControl from '../../../shared/components/ui/SegmentedControl.svelte';
  import SettingsRow from '../../../shared/components/ui/SettingsRow.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { app, setPdfLoadMode } from '../../../shared/lib/store.svelte';

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
  const visPdfLoad = $derived(matches(t('reader.pdf_load.title'), t('reader.pdf_load.desc'), 'pdf', 'lazy', 'eager'));

  const pdfLoadOptions = $derived([
    { value: 'lazy'  as const, label: t('reader.pdf_load.lazy'),  testId: 'settings-pdf-load-lazy' },
    { value: 'eager' as const, label: t('reader.pdf_load.eager'), testId: 'settings-pdf-load-eager' },
  ]);
</script>

{#if !searching || visPdfLoad}
  <section class="group" class:open data-test="settings-section-reader">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="book" size={14} /></span>
      <h2>{t('settings.section.reader')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        {#if visPdfLoad}
          <SettingsRow title={t('reader.pdf_load.title')} desc={t('reader.pdf_load.desc')}>
            <SegmentedControl
              options={pdfLoadOptions}
              value={app.pdfLoadMode}
              onChange={setPdfLoadMode}
              ariaLabel={t('reader.pdf_load.title')}
            />
          </SettingsRow>
        {/if}
      </div>
    {/if}
  </section>
{/if}
