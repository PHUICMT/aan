<script lang="ts">
  import { getSeries } from '../../shared/lib/api';
  import { tooltip } from '../../shared/lib/tooltip';
  import { getCoverUrl } from '../../shared/lib/covers';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { app, markContinueSeen, resumeLastReader, setLastReader } from '../../shared/lib/store.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../shared/components/Icon.svelte';

  let cover = $state<string | null>(null);
  let busy = $state(false);

  // Backfill seriesName/kind from DB when openReader was called from a
  // low-detail path (e.g. Library cover-click).
  $effect(() => {
    const lr = app.lastReader;
    cover = null;
    if (!lr) return;
    void getCoverUrl(lr.pid).then((url) => {
      if (url && app.lastReader?.pid === lr.pid) cover = url;
    });
    if (!lr.seriesName || !lr.kind) {
      void getSeries(lr.pid)
        .then((s) => {
          if (app.lastReader?.pid !== lr.pid) return;
          setLastReader({
            pid: lr.pid,
            chapterId: lr.chapterId,
            chapterNo: lr.chapterNo,
            seriesName: s.name,
            kind: s.type,
          });
        })
        .catch(() => {});
    }
  });

  async function onResume() {
    if (busy) return;
    busy = true;
    try { await resumeLastReader(); } finally { busy = false; }
  }
</script>

{#if app.lastReader && app.page !== 'reader' && app.lastReader.pid !== app.continueSeenPid}
  {@const lr = app.lastReader}
  {@const chip = TYPE_CHIP[lr.kind] ?? TYPE_CHIP.manga}
  <div
    class="pill"
    role="region"
    aria-label={t('continue.resume')}
    in:fly={{ y: 16, duration: 280, easing: cubicOut }}
    out:fly={{ y: 24, duration: 220, easing: cubicOut }}
    data-test="continue-pill"
  >
    <button
      class="main"
      onclick={onResume}
      use:tooltip={t('continue.resume')}
      aria-label={t('continue.resume')}
      data-test="continue-resume"
    >
      <div class="cover">
        <div class="cover-clip">
          {#if cover}
            <img src={cover} alt="" />
          {:else}
            <div class="cover-fallback">{(lr.seriesName || '?').charAt(0)}</div>
          {/if}
        </div>
        <div class="play"><Icon name="chevron_right" size={12} /></div>
      </div>
      <div class="info">
        <div class="top">
          <span class="chip" style:background={chip.bg} style:color={chip.fg}>{t(chip.labelKey)}</span>
          <span class="label">{t('continue.resume')}</span>
        </div>
        <div class="name" use:tooltip={lr.seriesName}>{lr.seriesName || '…'}</div>
        <div class="meta">{t('series.ch_no')} {lr.chapterNo}</div>
      </div>
    </button>
    <button class="close" onclick={markContinueSeen} aria-label={t('continue.dismiss')} use:tooltip={t('continue.dismiss')} data-test="continue-close">
      <Icon name="x" size={11} />
    </button>
  </div>
{/if}

<style>
  .pill {
    position: fixed; right: 14px; bottom: 18px; z-index: 60;
    display: inline-flex; align-items: stretch;
    max-width: 340px;
    background: color-mix(in srgb, var(--menu-bg) 55%, transparent);
    border: 1px solid var(--accent);
    border-radius: 9999px;
    box-shadow: 0 14px 38px -10px rgba(0,0,0,0.55), 0 0 0 4px var(--accent-dim);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    color: var(--text);
    overflow: hidden;
    transition:
      transform 0.32s var(--ease-out),
      box-shadow 0.32s var(--ease-out),
      max-width 0.32s var(--ease-out);
  }
  .pill:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 44px -10px rgba(0,0,0,0.65), 0 0 0 4px var(--accent-dim);
  }
  .close { flex-shrink: 0; }
  .cover { flex-shrink: 0; }
  .main {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 6px 7px 7px;
    background: transparent;
    color: inherit;
    text-align: left;
    flex: 1; min-width: 0;
    min-height: 58px;
    transition:
      min-height 0.32s var(--ease-out),
      padding 0.32s var(--ease-out);
  }
  .main:active { transform: scale(0.99); }
  .cover {
    position: relative;
    width: 44px; height: 44px;
    flex-shrink: 0;
  }
  .cover-clip {
    position: absolute; inset: 0;
    border-radius: 50%; overflow: hidden;
    background: var(--surface2);
    border: 1px solid var(--border-soft);
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cover-fallback {
    width: 100%; height: 100%;
    display: grid; place-items: center;
    color: var(--text3); font-weight: 700; font-size: 16px;
  }
  .play {
    position: absolute; right: -2px; bottom: -2px;
    width: 16px; height: 16px;
    display: grid; place-items: center;
    background: var(--accent); color: #fff;
    border-radius: 9999px;
    border: 2px solid var(--menu-bg);
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  }
  .info {
    display: flex; flex-direction: column; gap: 1px;
    min-width: 0; flex: 1 1 0;
    overflow: hidden;
  }
  .top { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
  .chip {
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
    padding: 1px 6px; border-radius: 9999px;
    text-transform: uppercase;
  }
  .label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    color: var(--accent); text-transform: uppercase;
  }
  .name {
    font-size: 12px; font-weight: 600;
    color: var(--text);
    max-width: 220px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .meta { font-size: 10px; color: var(--text2); white-space: nowrap; }
  .close {
    width: 32px;
    align-self: stretch;
    display: grid; place-items: center;
    background: transparent;
    border: none;
    border-left: 1px solid var(--border-soft);
    color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .close:hover { background: var(--hover-bg); color: var(--text); }
</style>
