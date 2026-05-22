<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import Button from '../../../shared/components/ui/Button.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';
  import {
    listDictionaries, installDictionary, removeDictionary,
    type Dictionary,
  } from '../../../shared/lib/api';

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
  const visDicts = $derived(matches(t('settings.section.dicts'), t('settings.dicts.desc'), 'dictionary', 'พจนานุกรม', 'lookup'));

  let dicts = $state<Dictionary[]>([]);
  let busy = $state(false);
  let errorMsg = $state<string | null>(null);

  async function refresh() {
    try { dicts = await listDictionaries(); } catch { dicts = []; }
  }

  // Refresh once when the section opens — the user typically won't be
  // adding dicts while the section is collapsed.
  $effect(() => {
    if (open) void refresh();
  });

  async function pickAndInstall() {
    errorMsg = null;
    busy = true;
    try {
      const picked = await openDialog({
        multiple: false,
        filters: [{ name: 'Dictionary (TSV)', extensions: ['tsv', 'txt'] }],
      });
      if (typeof picked !== 'string') return;
      await installDictionary(picked);
      await refresh();
    } catch (e) {
      errorMsg = String(e);
    } finally {
      busy = false;
    }
  }

  async function remove(filename: string) {
    await removeDictionary(filename);
    await refresh();
  }

  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

{#if !searching || visDicts}
  <section class="group" class:open data-test="settings-section-dicts">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="book" size={14} /></span>
      <h2>{t('settings.section.dicts')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        <div class="row">
          <div class="label">
            <div class="title">{t('settings.dicts.title')}</div>
            <div class="desc">{t('settings.dicts.desc')}</div>
          </div>
          <Button variant="primary" icon="plus" loading={busy} onclick={pickAndInstall} testId="dict-install">
            {busy ? t('settings.dicts.installing') : t('settings.dicts.install')}
          </Button>
        </div>

        {#if errorMsg}
          <div class="error" transition:slide={{ duration: 180, easing: cubicOut }}>{errorMsg}</div>
        {/if}

        {#if dicts.length > 0}
          <ul class="dict-list" data-test="dict-list">
            {#each dicts as d (d.filename)}
              <li class="dict-chip">
                <div class="dn">
                  <span class="d-name">{d.name}</span>
                  <span class="d-meta">{d.entries.toLocaleString()} entries · {fmtBytes(d.bytes)}</span>
                </div>
                <button class="del" type="button" onclick={() => remove(d.filename)} aria-label="Remove" data-test="dict-remove" data-dict-filename={d.filename}>
                  <Icon name="trash" size={12} />
                </button>
              </li>
            {/each}
          </ul>
        {/if}

        <div class="hint">
          <Icon name="alert_triangle" size={11} />
          <span>{t('settings.dicts.format_hint')}</span>
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
  }
  .label { min-width: 0; }
  .title { font-size: 13px; font-weight: 600; color: var(--text); }
  .desc { font-size: 11px; color: var(--text2); line-height: 1.4; margin-top: 2px; }


  .dict-list {
    list-style: none; margin: 4px 0 8px; padding: 0;
    display: flex; flex-direction: column; gap: 6px;
  }
  .dict-chip {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 10px 8px 14px; border-radius: 10px;
    background: var(--hover-bg);
    border: 1px solid var(--border);
    transition: border-color 0.15s var(--ease-out);
  }
  .dict-chip:hover { border-color: var(--accent); }
  .dn { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .d-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .d-meta { font-size: 10px; color: var(--text3); font-family: var(--font-mono); }
  .del {
    width: 28px; height: 28px; border-radius: 8px;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent; color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .del:hover { background: rgba(239,68,68,0.18); color: #ef4444; }

  .error {
    margin-top: 8px; padding: 8px 12px;
    border-radius: 8px;
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.32);
    color: #fca5a5; font-size: 11px;
  }
  .hint {
    display: inline-flex; align-items: center; gap: 6px;
    padding-top: 8px;
    color: var(--text3);
    font-size: 10px;
    line-height: 1.5;
  }
</style>
