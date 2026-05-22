<script lang="ts">
  import { untrack } from 'svelte';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';
  import Modal from '../../shared/components/ui/Modal.svelte';
  import Button from '../../shared/components/ui/Button.svelte';
  import {
    updateSeries,
    deleteSeriesForce,
    setSeriesCover,
    readCoverSource,
  } from '../../shared/lib/api';
  import type { SeriesDetail } from '../../shared/lib/types';
  import { t } from '../../shared/lib/i18n.svelte';
  import { invalidateCover } from '../../shared/lib/covers';

  type Props = {
    series: SeriesDetail;
    onClose: () => void;
    onSaved: () => void;
    onDeleted: () => void;
  };
  let { series, onClose, onSaved, onDeleted }: Props = $props();

  // Snapshot once on mount; this is an edit form, not a live mirror.
  let name = $state(untrack(() => series.name));
  let alias = $state(untrack(() => series.alias ?? ''));
  let info = $state(untrack(() => series.info ?? ''));
  let authorName = $state(untrack(() => series.author_name ?? ''));
  let artistName = $state(untrack(() => series.artist_name ?? ''));

  let saving = $state(false);
  let pickingCover = $state(false);
  let errorMsg = $state<string | null>(null);
  let confirmDelete = $state(false);

  // Cover file picker reads the chosen image, hands raw bytes to Rust;
  // Rust re-encodes as JPEG so the read-cover Blob path stays uniform.
  async function pickCover() {
    if (pickingCover) return;
    pickingCover = true;
    errorMsg = null;
    try {
      const picked = await openDialog({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      });
      if (!picked || Array.isArray(picked)) { pickingCover = false; return; }
      const bytes = await readCoverSource(picked);
      await setSeriesCover(series.pid, bytes);
      invalidateCover(series.pid);
    } catch (e) {
      errorMsg = String(e);
    } finally {
      pickingCover = false;
    }
  }

  async function save() {
    if (saving) return;
    if (!name.trim()) { errorMsg = t('series.edit.name_required'); return; }
    saving = true;
    errorMsg = null;
    try {
      await updateSeries(series.pid, {
        name: name.trim(),
        alias,
        info,
        authorName,
        artistName,
      });
      onSaved();
    } catch (e) {
      errorMsg = String(e);
    } finally {
      saving = false;
    }
  }

  async function doDelete() {
    if (saving) return;
    saving = true;
    errorMsg = null;
    try {
      await deleteSeriesForce(series.pid);
      onDeleted();
    } catch (e) {
      errorMsg = String(e);
      saving = false;
    }
  }
</script>

<Modal open onClose={onClose} title={t('series.edit.title')} size="md" testId="series-edit-modal">
    {#if errorMsg}
      <p class="err">{errorMsg}</p>
    {/if}

    {#if confirmDelete}
      <div class="danger-zone">
        <p>{t('series.edit.delete_confirm')}</p>
        <p class="muted">{t('series.edit.delete_warning')}</p>
        <div class="actions">
          <Button variant="ghost" onclick={() => (confirmDelete = false)} testId="series-edit-delete-cancel">{t('common.cancel')}</Button>
          <Button variant="danger" disabled={saving} onclick={doDelete} testId="series-edit-delete-confirm">{t('series.edit.delete_now')}</Button>
        </div>
      </div>
    {:else}
      <label class="field">
        <span>{t('series.edit.name')}</span>
        <input bind:value={name} data-test="series-edit-name" />
      </label>
      <label class="field">
        <span>{t('series.edit.alias')}</span>
        <input bind:value={alias} data-test="series-edit-alias" />
      </label>
      <div class="row">
        <label class="field">
          <span>{t('series.edit.author')}</span>
          <input bind:value={authorName} data-test="series-edit-author" />
        </label>
        <label class="field">
          <span>{t('series.edit.artist')}</span>
          <input bind:value={artistName} data-test="series-edit-artist" />
        </label>
      </div>
      <label class="field">
        <span>{t('series.edit.info')}</span>
        <textarea bind:value={info} rows="5" data-test="series-edit-info"></textarea>
      </label>
      <Button variant="ghost" icon="pencil" onclick={pickCover} disabled={pickingCover} testId="series-edit-replace-cover">
        {pickingCover ? t('series.edit.replacing_cover') : t('series.edit.replace_cover')}
      </Button>

      <div class="actions">
        <Button variant="danger-ghost" icon="trash" onclick={() => (confirmDelete = true)} testId="series-edit-delete-arm">
          {t('series.edit.delete')}
        </Button>
        <div class="spacer"></div>
        <Button variant="ghost" onclick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" loading={saving} onclick={save} testId="series-edit-save">
          {saving ? t('series.edit.saving') : t('series.edit.save')}
        </Button>
      </div>
    {/if}
</Modal>

<style>
  .err {
    background: rgba(248,113,113,0.12);
    border: 1px solid rgba(248,113,113,0.4);
    border-radius: 8px;
    padding: 8px 12px;
    color: #f87171;
    font-size: 12.5px;
    margin: 0 0 12px;
  }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .field span { font-size: 11.5px; color: var(--muted, rgba(255,255,255,0.7)); }
  .field input, .field textarea {
    background: rgba(255,255,255,0.05);
    color: var(--text, #fff);
    border: 1px solid var(--border, rgba(255,255,255,0.12));
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
  }
  .field input:focus, .field textarea:focus {
    outline: none;
    border-color: var(--accent, #7c5cff);
  }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .actions { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
  .spacer { flex: 1; }
  .danger-zone { padding: 16px; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.3); border-radius: 10px; }
  .danger-zone p { margin: 0 0 6px; color: var(--text, #fff); font-size: 13px; }
  .danger-zone .muted { color: var(--muted, rgba(255,255,255,0.6)); font-size: 11.5px; margin-bottom: 12px; }
</style>
