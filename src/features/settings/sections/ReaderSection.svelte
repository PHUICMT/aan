<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
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
          <div class="row">
            <div class="label">
              <div class="title">{t('reader.pdf_load.title')}</div>
              <div class="desc">{t('reader.pdf_load.desc')}</div>
            </div>
            <div class="seg" data-mode={app.pdfLoadMode}>
              <span class="seg-indicator" aria-hidden="true"></span>
              <button
                class="seg-btn"
                class:active={app.pdfLoadMode === 'lazy'}
                onclick={() => setPdfLoadMode('lazy')}
                data-test="settings-pdf-load-lazy"
              >{t('reader.pdf_load.lazy')}</button>
              <button
                class="seg-btn"
                class:active={app.pdfLoadMode === 'eager'}
                onclick={() => setPdfLoadMode('eager')}
                data-test="settings-pdf-load-eager"
              >{t('reader.pdf_load.eager')}</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  /* Sliding-indicator segmented control: a single accent pill that
     translates between options, so switching feels continuous instead
     of two buttons toggling at once. */
  .seg {
    position: relative;
    display: inline-flex;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 2px;
  }
  .seg-indicator {
    position: absolute;
    top: 2px; bottom: 2px;
    left: 2px;
    width: calc(50% - 2px);
    background: var(--accent);
    border-radius: 9999px;
    box-shadow: 0 4px 12px -4px var(--accent-glow);
    transition: transform 320ms cubic-bezier(0.32, 1.25, 0.52, 1);
    z-index: 0;
    pointer-events: none;
  }
  .seg[data-mode="eager"] .seg-indicator { transform: translateX(100%); }
  .seg-btn {
    position: relative;
    z-index: 1;
    padding: 5px 14px;
    min-width: 64px;
    border-radius: 9999px;
    background: transparent;
    color: var(--text2);
    font-size: 11px; font-weight: 600;
    border: none;
    cursor: pointer;
    transition: color 200ms var(--ease-out);
  }
  .seg-btn:hover:not(.active) { color: var(--text); }
  .seg-btn.active { color: #fff; }
</style>
