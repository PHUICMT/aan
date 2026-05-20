<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { moveDataStatus, type MoveJob } from '../../shared/lib/api';
  import { navigate } from '../../shared/lib/store.svelte';
  import { t } from '../../shared/lib/i18n.svelte';

  // App-wide banner for data-folder move: paused-resume prompt, live
  // percent during the move, and finalize prompt after the walk finishes.
  let job = $state<MoveJob | null>(null);
  let unlisten: UnlistenFn | null = null;

  onMount(async () => {
    job = await moveDataStatus();
    try {
      unlisten = await listen<MoveJob>('data-move:progress', (e) => {
        job = e.payload;
      });
    } catch {}
  });

  onDestroy(() => {
    if (unlisten) unlisten();
  });

  const visible = $derived(
    !!job && job.status !== 'cancelled',
  );

  const pct = $derived.by(() => {
    if (!job || !job.bytes_total) return 0;
    return Math.min(100, Math.round((job.bytes_done / job.bytes_total) * 100));
  });

  function open() {
    navigate('settings');
  }
</script>

{#if visible && job}
  <button class="banner status-{job.status}" onclick={open} use:tooltip={t('data_folder.banner.open_settings')}>
    <span class="dot"></span>
    <span class="text">
      {#if job.status === 'running'}{t('data_folder.banner.running').replace('{pct}', String(pct))}
      {:else if job.status === 'paused'}{t('data_folder.banner.paused')}
      {:else if job.status === 'failed'}{t('data_folder.banner.failed')}
      {:else if job.status === 'done'}{t('data_folder.banner.done')}
      {/if}
    </span>
  </button>
{/if}

<style>
  .banner {
    position: fixed;
    top: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    background: linear-gradient(180deg, #6366f1, #4f46e5);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    animation: slideDown 220ms ease-out;
  }
  .banner:hover { filter: brightness(1.1); }
  .banner.status-paused { background: linear-gradient(180deg, #d18a2a, #b07221); }
  .banner.status-failed { background: linear-gradient(180deg, #d4423b, #b8332c); }
  .banner.status-done   { background: linear-gradient(180deg, #16a34a, #15803d); }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    animation: pulse 1.6s infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(255, 255, 255, 0); }
  }
  @keyframes slideDown {
    from { transform: translate(-50%, -16px); opacity: 0; }
    to   { transform: translate(-50%, 0); opacity: 1; }
  }
</style>
