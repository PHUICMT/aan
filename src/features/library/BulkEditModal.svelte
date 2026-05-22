<script lang="ts">
  import { t } from '../../shared/lib/i18n.svelte';
  import { bulkUpdateSeries, bulkDeleteSeries } from '../../shared/lib/api';
  import { bumpSeriesMutation } from '../../shared/lib/store.svelte';
  import Modal from '../../shared/components/ui/Modal.svelte';
  import Button from '../../shared/components/ui/Button.svelte';

  type Props = {
    pids: number[];
    onClose: () => void;
    onApplied: () => void;
  };
  let { pids, onClose, onApplied }: Props = $props();

  let authorName = $state('');
  let artistName = $state('');
  let readingStatus = $state<'' | 'plan' | 'reading' | 'completed' | 'on_hold' | 'dropped' | 'clear'>('');
  let addTagsText = $state('');
  let removeTagsText = $state('');
  let busy = $state(false);
  let err = $state<string | null>(null);
  let confirmDelete = $state(false);

  function splitTags(s: string): string[] {
    return s.split(',').map((t) => t.trim()).filter(Boolean);
  }

  async function apply() {
    err = null;
    busy = true;
    try {
      await bulkUpdateSeries(pids, {
        authorName: authorName.trim() || undefined,
        artistName: artistName.trim() || undefined,
        readingStatus: (readingStatus === '' || readingStatus === 'clear') ? undefined : readingStatus,
        clearReadingStatus: readingStatus === 'clear',
        addTags: splitTags(addTagsText),
        removeTags: splitTags(removeTagsText),
      });
      bumpSeriesMutation();
      onApplied();
    } catch (e) {
      err = String(e);
    } finally {
      busy = false;
    }
  }

  async function doDelete() {
    err = null;
    busy = true;
    try {
      await bulkDeleteSeries(pids);
      bumpSeriesMutation();
      onApplied();
    } catch (e) {
      err = String(e);
    } finally {
      busy = false;
    }
  }
</script>

<Modal
  open
  onClose={onClose}
  title={t('library.bulk.title').replace('{n}', String(pids.length))}
  size="md"
  testId="bulk-edit-modal"
>
    <p class="bm-hint">{t('library.bulk.hint')}</p>

    <div class="bm-grid">
      <label>
        <span>{t('series.author')}</span>
        <input type="text" bind:value={authorName} placeholder={t('library.bulk.leave')} data-test="bulk-author" />
      </label>
      <label>
        <span>{t('series.artist')}</span>
        <input type="text" bind:value={artistName} placeholder={t('library.bulk.leave')} data-test="bulk-artist" />
      </label>
      <label>
        <span>{t('rs.set')}</span>
        <select bind:value={readingStatus} data-test="bulk-rs">
          <option value="">{t('library.bulk.leave')}</option>
          <option value="plan">{t('rs.plan')}</option>
          <option value="reading">{t('rs.reading')}</option>
          <option value="completed">{t('rs.completed')}</option>
          <option value="on_hold">{t('rs.on_hold')}</option>
          <option value="dropped">{t('rs.dropped')}</option>
          <option value="clear">{t('rs.clear')}</option>
        </select>
      </label>
      <label class="span-2">
        <span>{t('library.bulk.add_tags')}</span>
        <input type="text" bind:value={addTagsText} placeholder={t('library.bulk.tag_csv')} data-test="bulk-add-tags" />
      </label>
      <label class="span-2">
        <span>{t('library.bulk.remove_tags')}</span>
        <input type="text" bind:value={removeTagsText} placeholder={t('library.bulk.tag_csv')} data-test="bulk-remove-tags" />
      </label>
    </div>

    {#if err}
      <div class="bm-err" data-test="bulk-err">{err}</div>
    {/if}

    <footer class="bm-foot">
      {#if !confirmDelete}
        <Button variant="danger" icon="trash" onclick={() => (confirmDelete = true)} disabled={busy} testId="bulk-delete-arm">
          {t('library.bulk.delete')}
        </Button>
      {:else}
        <span class="confirm-text">{t('library.bulk.delete_confirm').replace('{n}', String(pids.length))}</span>
        <Button variant="danger" loading={busy} onclick={doDelete} testId="bulk-delete-confirm">
          {t('library.bulk.delete_confirm_cta')}
        </Button>
        <Button variant="ghost" onclick={() => (confirmDelete = false)} disabled={busy} testId="bulk-cancel-inline">{t('common.cancel')}</Button>
      {/if}
      <div class="spacer"></div>
      <Button variant="ghost" onclick={onClose} disabled={busy} testId="bulk-cancel-footer">{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} onclick={apply} testId="bulk-apply">
        {t('library.bulk.apply')}
      </Button>
    </footer>
</Modal>

<style>
  .bm-hint { margin: 0 0 14px; font-size: 12px; color: var(--text2); line-height: 1.5; }
  .bm-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px;
  }
  .bm-grid label {
    display: flex; flex-direction: column; gap: 4px;
    font-size: 11px; color: var(--text2);
  }
  .bm-grid label.span-2 { grid-column: span 2; }
  .bm-grid input, .bm-grid select {
    padding: 8px 10px;
    background: rgba(127,127,127,0.08);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text); font-size: 12.5px;
    outline: none;
    transition: border-color 0.15s var(--ease-out);
  }
  .bm-grid input:focus, .bm-grid select:focus { border-color: var(--accent); }
  .bm-err {
    margin: 10px 0 0; padding: 8px 12px;
    border-radius: 8px;
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.32);
    color: #fca5a5; font-size: 11px;
  }
  .bm-foot {
    display: flex; align-items: center; gap: 8px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .spacer { flex: 1; }
  .confirm-text { font-size: 11px; color: var(--warning); }
</style>
