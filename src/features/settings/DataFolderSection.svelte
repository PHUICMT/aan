<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { open as openDialog } from '@tauri-apps/plugin-dialog';
  import Icon from '../../shared/components/Icon.svelte';
  import Modal from '../../shared/components/ui/Modal.svelte';
  import Button from '../../shared/components/ui/Button.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import {
    getDataFolderInfo,
    setDataFolder,
    moveDataStatus,
    startMoveData,
    pauseMoveData,
    cancelMoveData,
    finalizeMoveData,
    type DataFolderInfo,
    type MoveJob,
  } from '../../shared/lib/api';

  let info = $state<DataFolderInfo | null>(null);
  let destInput = $state('');
  let applyingDirect = $state(false);
  let busy = $state(false);
  let errMsg = $state<string | null>(null);

  let job = $state<MoveJob | null>(null);
  let showModal = $state(false);
  let deletePartial = $state(false);
  let deleteSource = $state(false);
  let unlisten: UnlistenFn | null = null;

  async function refreshInfo() {
    try { info = await getDataFolderInfo(); }
    catch (e) { errMsg = `${e}`; }
  }

  async function refreshJob() {
    job = await moveDataStatus();
    if (job && (job.status === 'running' || job.status === 'paused' || job.status === 'failed')) {
      showModal = true;
    }
  }

  onMount(async () => {
    await refreshInfo();
    await refreshJob();
    try {
      unlisten = await listen<MoveJob>('data-move:progress', (e) => {
        job = e.payload;
      });
    } catch {}
  });

  onDestroy(() => {
    if (unlisten) unlisten();
  });

  async function onApplyDirect() {
    if (!destInput.trim()) return;
    applyingDirect = true;
    errMsg = null;
    try {
      await setDataFolder(destInput.trim());
      destInput = '';
      await refreshInfo();
    } catch (e) {
      errMsg = `${e}`;
    } finally {
      applyingDirect = false;
    }
  }

  async function onResetDefault() {
    busy = true;
    errMsg = null;
    try {
      await setDataFolder(null);
      await refreshInfo();
    } catch (e) {
      errMsg = `${e}`;
    } finally {
      busy = false;
    }
  }

  async function onOpenMoveModal() {
    destInput = '';
    errMsg = null;
    showModal = true;
    await refreshJob();
  }

  async function onStartMove() {
    if (!destInput.trim()) { errMsg = t('data_folder.input.path_required'); return; }
    errMsg = null;
    try {
      await startMoveData(destInput.trim());
      await refreshJob();
    } catch (e) {
      errMsg = `${e}`;
    }
  }

  async function onResume() {
    if (!job) return;
    errMsg = null;
    try {
      await startMoveData(job.dest);
      await refreshJob();
    } catch (e) {
      errMsg = `${e}`;
    }
  }

  async function onPause() {
    try { await pauseMoveData(); } catch (e) { errMsg = `${e}`; }
  }

  async function onCancel() {
    if (!confirm(deletePartial ? t('data_folder.cancel.confirm_delete') : t('data_folder.cancel.confirm_keep'))) return;
    try {
      await cancelMoveData(deletePartial);
      job = null;
      showModal = false;
    } catch (e) {
      errMsg = `${e}`;
    }
  }

  async function onFinalize() {
    try {
      await finalizeMoveData(deleteSource);
      job = null;
      showModal = false;
      await refreshInfo();
    } catch (e) {
      errMsg = `${e}`;
    }
  }

  async function pickFolder() {
    try {
      const picked = await openDialog({
        directory: true,
        multiple: false,
        title: t('data_folder.pick.title'),
        defaultPath: info?.current,
      });
      if (typeof picked === 'string' && picked) {
        destInput = picked;
      }
    } catch (e) {
      errMsg = `${e}`;
    }
  }

  function fmtBytes(n: number): string {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
  }

  const pct = $derived.by(() => {
    if (!job || !job.bytes_total) return 0;
    return Math.min(100, Math.round((job.bytes_done / job.bytes_total) * 100));
  });
</script>

<section class="group">
  <h2>{t('settings.section.data_folder')}</h2>

  <div class="row col">
    <div class="label">
      <div class="title">{t('data_folder.current.title')}</div>
      <div class="desc">{t('data_folder.current.desc')}</div>
    </div>
    <div class="path-box">
      <code data-test="datafolder-current-path">{info?.current ?? '...'}</code>
      {#if info?.is_custom}
        <span class="chip">{t('data_folder.chip.custom')}</span>
      {:else}
        <span class="chip default">{t('data_folder.chip.default')}</span>
      {/if}
    </div>
    {#if info?.is_custom && info?.default}
      <div class="desc small">{t('data_folder.default_path')} <code>{info.default}</code></div>
    {/if}
  </div>

  <div class="row">
    <div class="label">
      <div class="title">{t('data_folder.move.title')}</div>
      <div class="desc">{t('data_folder.move.desc')}</div>
    </div>
    <button class="action" onclick={onOpenMoveModal}>
      <Icon name="folder" size={12} />
      {t('data_folder.move.cta')}
    </button>
  </div>

  <div class="row">
    <div class="label">
      <div class="title">{t('data_folder.manual.title')}</div>
      <div class="desc">{t('data_folder.manual.desc')}</div>
    </div>
  </div>
  <div class="row inline">
    <input
      type="text"
      class="input"
      placeholder={t('data_folder.manual.placeholder')}
      bind:value={destInput}
    />
    <Button variant="ghost" icon="folder" onclick={pickFolder}>{t('data_folder.manual.pick')}</Button>
    <Button variant="primary" icon="check" disabled={applyingDirect || !destInput.trim()} onclick={onApplyDirect}>
      {t('data_folder.manual.apply')}
    </Button>
    {#if info?.is_custom}
      <Button variant="warn" disabled={busy} onclick={onResetDefault}>
        {t('data_folder.manual.reset')}
      </Button>
    {/if}
  </div>

  {#if errMsg}<p class="msg warn">{errMsg}</p>{/if}
</section>

<Modal
  open={showModal}
  onClose={() => (showModal = false)}
  title={t('data_folder.modal.title')}
  size="md"
  testId="data-folder-modal"
>
      {#if !job}
        <p class="hint">{t('data_folder.modal.hint')}</p>
        <div class="picker-row">
          <input
            type="text"
            class="input"
            placeholder={t('data_folder.manual.placeholder')}
            bind:value={destInput}
          />
          <Button variant="ghost" icon="folder" onclick={pickFolder}>{t('data_folder.manual.pick')}</Button>
        </div>
        {#if errMsg}<p class="msg warn">{errMsg}</p>{/if}
        <div class="actions">
          <Button variant="primary" icon="download" disabled={!destInput.trim()} onclick={onStartMove}>
            {t('data_folder.modal.start')}
          </Button>
          <Button variant="ghost" onclick={() => (showModal = false)}>{t('data_folder.modal.close')}</Button>
        </div>
      {:else}
        <div class="job-from-to">
          <div><span class="muted">{t('data_folder.modal.from')}</span> <code>{job.source}</code></div>
          <div><span class="muted">{t('data_folder.modal.to')}</span> <code>{job.dest}</code></div>
        </div>

        <div class="bar-wrap">
          <div class="bar"><div class="fill" style:width="{pct}%"></div></div>
          <div class="bar-meta">
            <span>{pct}%</span>
            <span>{job.files_done}/{job.files_total} {t('data_folder.modal.files')}</span>
            <span>{fmtBytes(job.bytes_done)} / {fmtBytes(job.bytes_total)}</span>
          </div>
        </div>

        {#if job.current}
          <div class="current">📄 {job.current}</div>
        {/if}

        <div class="status-line status-{job.status}">
          {#if job.status === 'running'}{t('data_folder.status.running')}
          {:else if job.status === 'paused'}{t('data_folder.status.paused')}
          {:else if job.status === 'done'}{t('data_folder.status.done')}
          {:else if job.status === 'failed'}{t('data_folder.status.failed')} ({job.errors.length})
          {:else if job.status === 'cancelled'}{t('data_folder.status.cancelled')}
          {/if}
        </div>

        {#if job.errors.length > 0}
          <details class="errors">
            <summary>{t('data_folder.errors.heading')} ({job.errors.length})</summary>
            <ul>
              {#each job.errors.slice(-20) as e}
                <li>{e}</li>
              {/each}
            </ul>
          </details>
        {/if}

        {#if errMsg}<p class="msg warn">{errMsg}</p>{/if}

        <div class="actions">
          {#if job.status === 'running'}
            <Button variant="warn" icon="square" onclick={onPause}>{t('data_folder.pause')}</Button>
            <Button variant="ghost" onclick={() => (showModal = false)}>{t('data_folder.hide')}</Button>
          {:else if job.status === 'paused'}
            <Button variant="primary" icon="chevron_right" onclick={onResume}>{t('data_folder.resume')}</Button>
            <label class="chk">
              <input type="checkbox" bind:checked={deletePartial} />
              {t('data_folder.delete_partial')}
            </label>
            <Button variant="danger-ghost" onclick={onCancel}>{t('data_folder.cancel_job')}</Button>
          {:else if job.status === 'failed'}
            <Button variant="primary" icon="sync" onclick={onResume}>{t('data_folder.retry')}</Button>
            <Button variant="danger-ghost" onclick={onCancel}>{t('data_folder.cancel_job')}</Button>
          {:else if job.status === 'done'}
            <label class="chk">
              <input type="checkbox" bind:checked={deleteSource} />
              {t('data_folder.delete_source')}
            </label>
            <Button variant="primary" icon="check" onclick={onFinalize}>{t('data_folder.finalize')}</Button>
          {:else}
            <Button variant="ghost" onclick={() => (showModal = false)}>{t('data_folder.modal.close')}</Button>
          {/if}
        </div>
      {/if}
</Modal>

<style>
  .group {
    margin-bottom: 28px;
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 20px;
  }
  .group h2 {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
    margin-bottom: 8px;
  }
  .row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 20px; padding: 12px 0;
    border-bottom: 1px solid var(--border-soft);
  }
  .row.col { flex-direction: column; align-items: stretch; gap: 8px; }
  .row.inline { gap: 8px; }
  .row:last-child { border-bottom: none; }
  .label .title { font-size: 13px; font-weight: 500; color: var(--text); }
  .label .desc  { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .desc.small { font-size: 11px; color: var(--text3); }

  .path-box {
    display: flex; align-items: center; gap: 8px;
    background: var(--hover-bg);
    border: 1px solid var(--border-soft);
    padding: 8px 10px; border-radius: 8px;
  }
  .path-box code { font-size: 12px; color: var(--text); flex: 1; word-break: break-all; }
  .chip {
    font-size: 10px; padding: 2px 8px; border-radius: 9999px;
    background: var(--accent-dim); color: var(--sidebar-hi);
    border: 1px solid var(--accent);
    flex-shrink: 0;
  }
  .chip.default {
    background: var(--surface2); color: var(--text2);
    border-color: var(--border);
  }

  .input {
    flex: 1;
    padding: 7px 12px; border-radius: 8px;
    background: var(--surface2); color: var(--text);
    border: 1px solid var(--border);
    font-size: 12px;
    outline: none;
  }
  .input:focus { border-color: var(--accent); }


  .msg.warn { color: var(--warning); }
  .msg {
    margin-top: 8px; font-size: 11px; color: var(--text2);
    padding: 8px 12px; border-radius: 8px;
    background: rgba(255,255,255,0.04);
  }

  .hint { font-size: 12px; color: var(--text2); margin-bottom: 8px; }
  .picker-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }

  .job-from-to {
    background: var(--hover-bg);
    border-radius: 8px; padding: 10px 12px;
    font-size: 11px; line-height: 1.7;
    margin-bottom: 12px;
  }
  .job-from-to code { color: var(--text); word-break: break-all; }
  .muted { color: var(--text3); margin-right: 6px; }

  .bar-wrap { margin: 8px 0 6px; }
  .bar {
    height: 8px; border-radius: 9999px;
    background: var(--surface2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%);
    transition: width 0.2s var(--ease-out);
  }
  .bar-meta {
    display: flex; justify-content: space-between;
    font-size: 11px; color: var(--text2);
    margin-top: 6px;
  }
  .current {
    font-size: 11px; color: var(--text2);
    margin: 6px 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .status-line {
    font-size: 12px; padding: 6px 10px; border-radius: 6px;
    margin: 8px 0 4px;
    background: var(--hover-bg); color: var(--text2);
  }
  .status-running { color: var(--accent); }
  .status-paused  { color: var(--warning); }
  .status-done    { color: #4ade80; }
  .status-failed  { color: var(--danger); }
  .status-cancelled { color: var(--text3); }

  .errors {
    margin: 8px 0;
    font-size: 11px; color: var(--text2);
  }
  .errors summary { cursor: pointer; padding: 4px 0; }
  .errors ul { margin: 4px 0 0 14px; padding-left: 8px; max-height: 120px; overflow: auto; }
  .errors li { margin: 2px 0; }

  .actions {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    margin-top: 14px;
  }
  .chk {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--text2);
    user-select: none; cursor: pointer;
  }
</style>
