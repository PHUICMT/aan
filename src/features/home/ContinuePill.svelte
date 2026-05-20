<script lang="ts">
  import { getSeries } from '../../shared/lib/api';
  import { tooltip } from '../../shared/lib/tooltip';
  import { getCoverUrl } from '../../shared/lib/covers';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import { app, dismissContinue, restoreContinue, resumeLastReader, setLastReader } from '../../shared/lib/store.svelte';
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

{#if app.lastReader && app.page !== 'reader'}
  {@const lr = app.lastReader}
  {@const chip = TYPE_CHIP[lr.kind] ?? TYPE_CHIP.manga}
  <div
    class="pill"
    class:collapsed={app.continueDismissed}
    role="region"
    aria-label={t('continue.resume')}
    in:fly={{ y: 16, duration: 280, easing: cubicOut }}
    out:fly={{ y: 24, duration: 220, easing: cubicOut }}
  >
    <button
      class="main"
      onclick={app.continueDismissed ? restoreContinue : onResume}
      use:tooltip={app.continueDismissed ? t('continue.resume') : t('continue.resume')}
      aria-label={t('continue.resume')}
    >
      <div class="cover">
        <div class="cover-clip">
          {#if cover}
            <img src={cover} alt="" />
          {:else}
            <div class="cover-fallback">{(lr.seriesName || '?').charAt(0)}</div>
          {/if}
          <div class="pull"><span class="pull-icon"><Icon name="chevron_left" size={16} /></span></div>
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
    <button class="close" onclick={dismissContinue} aria-label={t('continue.dismiss')} use:tooltip={t('continue.dismiss')}>
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
  /* Collapsed: half-tucked off the right edge so it reads as a drawer pull. */
  .pill.collapsed {
    max-width: 48px;
    width: 48px; height: 48px;
    right: -22px;
    border-width: 2px;
    box-shadow:
      0 0 0 5px var(--accent-dim),
      0 0 18px var(--accent-glow),
      0 10px 26px -10px rgba(0,0,0,0.55);
    cursor: pointer;
    transition:
      transform 0.32s var(--ease-out),
      box-shadow 0.32s var(--ease-out),
      max-width 0.32s var(--ease-out),
      right 0.32s var(--ease-out);
  }
  /* Hover pulls the full circle into view for a proper click target. */
  .pill.collapsed:hover {
    right: -4px;
    transform: translateY(-1px);
  }
  /* Clip rather than display:none so height stays constant during the
     width animation (no vertical pop). */
  .pill.collapsed .info,
  .pill.collapsed .close {
    opacity: 0;
    pointer-events: none;
  }
  .pill.collapsed .info { transition: opacity 0.18s var(--ease-out); }
  .pill .info, .pill .close { transition: opacity 0.24s var(--ease-out) 0.08s; }
  .pill.collapsed .main {
    padding: 0; min-height: 44px;
    width: 44px; height: 44px;
    overflow: hidden;
    flex: 0 0 44px;
  }
  /* Collapse .close to 0 width so .main keeps its full 44px (otherwise
     the cover gets squished to a sliver). */
  .pill.collapsed .close { width: 0; min-width: 0; border-left: none; }
  /* Drop the inner radius + border so the pill's own circular clip
     handles the edge — no dark crescent gap on the right. */
  .pill.collapsed .cover-clip { border-radius: 0; border: none; }
  .close { flex-shrink: 0; }
  .cover { flex-shrink: 0; }
  .pull {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s var(--ease-out);
  }
  .pill.collapsed .pull { opacity: 1; }
  .pill.collapsed .pull-icon {
    display: inline-flex;
    animation: nudge 1.6s var(--ease-in-out) infinite;
  }
  .pill.collapsed .play { display: none; }
  @keyframes nudge {
    0%, 100% { transform: translateX(0); }
    50%      { transform: translateX(-3px); }
  }
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
