<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import Button from '../../../shared/components/ui/Button.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
  import {
    createBackup, readBackupMetadata, restoreBackup,
    type BackupStats, type BackupMetadata,
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
  const visBackup = $derived(matches(t('settings.section.backup'), t('settings.backup.desc'), 'backup', 'restore', 'สำรอง', 'zip'));

  let busy = $state<'idle' | 'backing-up' | 'reading' | 'restoring'>('idle');
  let lastStats = $state<BackupStats | null>(null);
  let preview = $state<{ path: string; meta: BackupMetadata } | null>(null);
  let confirmRestore = $state(false);
  let errorMsg = $state<string | null>(null);

  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  async function doBackup() {
    errorMsg = null;
    const stamp = new Date().toISOString().slice(0, 10);
    const defaultName = `aan-backup-${stamp}.aan.zip`;
    try {
      const dest = await saveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'Aan backup', extensions: ['zip'] }],
      });
      if (typeof dest !== 'string') return;
      busy = 'backing-up';
      lastStats = await createBackup(dest);
    } catch (e) {
      errorMsg = String(e);
    } finally {
      busy = 'idle';
    }
  }

  async function pickRestoreFile() {
    errorMsg = null;
    confirmRestore = false;
    preview = null;
    try {
      const picked = await openDialog({
        multiple: false,
        filters: [{ name: 'Aan backup', extensions: ['zip'] }],
      });
      if (typeof picked !== 'string') return;
      busy = 'reading';
      const meta = await readBackupMetadata(picked);
      preview = { path: picked, meta };
    } catch (e) {
      errorMsg = String(e);
    } finally {
      busy = 'idle';
    }
  }

  async function doRestore() {
    if (!preview) return;
    errorMsg = null;
    busy = 'restoring';
    try {
      const stats = await restoreBackup(preview.path);
      lastStats = stats;
      preview = null;
      confirmRestore = false;
      // The DB just got replaced; reload to remount everything cleanly.
      location.reload();
    } catch (e) {
      errorMsg = String(e);
    } finally {
      busy = 'idle';
    }
  }
</script>

{#if !searching || visBackup}
  <section class="group" class:open data-test="settings-section-backup">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="download" size={14} /></span>
      <h2>{t('settings.section.backup')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        <div class="row">
          <div class="label">
            <div class="title">{t('settings.backup.create.title')}</div>
            <div class="desc">{t('settings.backup.create.desc')}</div>
          </div>
          <Button variant="primary" icon="download" loading={busy === 'backing-up'} disabled={busy !== 'idle' && busy !== 'backing-up'} onclick={doBackup} testId="backup-create">
            {busy === 'backing-up' ? t('settings.backup.creating') : t('settings.backup.create.cta')}
          </Button>
        </div>

        {#if lastStats}
          <div class="status ok" transition:slide={{ duration: 200, easing: cubicOut }}>
            {t('settings.backup.created').replace('{n}', String(lastStats.files)).replace('{b}', fmtBytes(lastStats.bytes))}
          </div>
        {/if}

        <div class="row">
          <div class="label">
            <div class="title">{t('settings.backup.restore.title')}</div>
            <div class="desc warn">{t('settings.backup.restore.desc')}</div>
          </div>
          <Button variant="ghost" icon="folder_open" disabled={busy !== 'idle'} onclick={pickRestoreFile} testId="backup-pick-restore">
            {t('settings.backup.restore.pick')}
          </Button>
        </div>

        {#if preview}
          <div class="preview" transition:slide={{ duration: 220, easing: cubicOut }}>
            <div class="prv-line"><strong>{preview.path}</strong></div>
            <div class="prv-line muted">
              {t('settings.backup.preview').replace('{n}', String(preview.meta.files)).replace('{b}', fmtBytes(preview.meta.bytes)).replace('{when}', preview.meta.created_at)}
            </div>
            {#if !confirmRestore}
              <Button variant="danger" icon="alert_triangle" onclick={() => (confirmRestore = true)} testId="backup-restore-arm">
                {t('settings.backup.restore.arm')}
              </Button>
            {:else}
              <div class="confirm-row" transition:slide={{ duration: 180, easing: cubicOut }}>
                <span class="confirm-text">{t('settings.backup.restore.confirm')}</span>
                <Button variant="danger" loading={busy === 'restoring'} disabled={busy !== 'idle' && busy !== 'restoring'} onclick={doRestore} testId="backup-restore-confirm">
                  {busy === 'restoring' ? t('settings.backup.restoring') : t('settings.backup.restore.confirm_cta')}
                </Button>
                <Button variant="ghost" disabled={busy !== 'idle'} onclick={() => (confirmRestore = false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            {/if}
          </div>
        {/if}

        {#if errorMsg}
          <div class="status err" transition:slide={{ duration: 180, easing: cubicOut }}>{errorMsg}</div>
        {/if}
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
    border-bottom: 1px dashed var(--border-soft);
  }
  .row:last-of-type { border-bottom: none; }
  .label { min-width: 0; }
  .title { font-size: 13px; font-weight: 600; color: var(--text); }
  .desc { font-size: 11px; color: var(--text2); line-height: 1.4; margin-top: 2px; }
  .desc.warn { color: #fbbf24; }


  .status {
    margin-top: 10px; padding: 8px 12px; border-radius: 8px;
    font-size: 11px;
  }
  .status.ok  { background: rgba(34,197,94,0.12);  color: #86efac; border: 1px solid rgba(34,197,94,0.32); }
  .status.err { background: rgba(239,68,68,0.12);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.32); }

  .preview {
    margin-top: 12px; padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--hover-bg);
    display: flex; flex-direction: column; gap: 6px;
  }
  .prv-line { font-size: 12px; color: var(--text); word-break: break-all; }
  .prv-line.muted { color: var(--text2); font-size: 11px; }
  .confirm-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 4px;
  }
  .confirm-text { font-size: 11px; color: #fbbf24; flex: 1; min-width: 200px; }
</style>
