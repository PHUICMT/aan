<script lang="ts">
  import { onMount } from 'svelte';
  import { getVersion } from '@tauri-apps/api/app';
  import Icon from '../shared/components/Icon.svelte';
  import { NAV_ITEMS, READING_STATUSES } from '../shared/lib/constants';
  import { t } from '../shared/lib/i18n.svelte';
  import { tooltip } from '../shared/lib/tooltip';
  import { app, navigate, toggleSidebar, toggleShortcuts, openList } from '../shared/lib/store.svelte';
  import { listLocalSeries } from '../shared/lib/api';
  import type { ReadingStatus } from '../shared/lib/types';

  let counts = $state<Record<string, number>>({});
  let version = $state<string>('');

  async function refreshCounts() {
    try {
      const all = await listLocalSeries();
      const c: Record<string, number> = {};
      for (const s of all) {
        if (s.reading_status) c[s.reading_status] = (c[s.reading_status] ?? 0) + 1;
      }
      counts = c;
    } catch {}
  }
  onMount(() => {
    refreshCounts();
    getVersion().then((v) => (version = v)).catch(() => {});
  });
  $effect(() => {
    void app.seriesMutationTick;
    if (app.page === 'library' || app.page === 'home' || app.page === 'list' || app.page === 'series') {
      void refreshCounts();
    }
  });
</script>

<aside class="sidebar" class:collapsed={app.sidebarCollapsed} data-test="sidebar">
  <div class="sec-row top-sec">
    <div class="sec-label">{t('nav.section')}</div>
    <button class="collapse-btn" onclick={toggleSidebar} use:tooltip={"Collapse sidebar"} data-test="sidebar-collapse">
      <Icon name={app.sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={12} />
    </button>
  </div>
  <div class="scroll-area">
  <nav>
    {#each NAV_ITEMS as it (it.id)}
      <button
        class="nav-item"
        class:active={app.page === it.id}
        onclick={() => navigate(it.id)}
        data-test={`nav-${it.id}`}
      >
        <span class="icon">
          <Icon name={it.icon} size={15} />
        </span>
        <span class="label">{t(it.labelKey)}</span>
      </button>
    {/each}
  </nav>

  <div class="lists-divider"></div>
  <div class="sec-row lists-head">
    <div class="sec-label">{t('nav.lists')}</div>
  </div>
  <nav class="lists-nav">
    {#each READING_STATUSES as s (s.id)}
      {@const isActive = app.page === 'list' && app.listStatus === s.id}
      {@const n = counts[s.id] ?? 0}
      <button
        class="nav-item list-item"
        class:active={isActive}
        style:--rs={s.chipColor}
        onclick={() => openList(s.id as ReadingStatus)}
        data-test={`list-${s.id}`}
      >
        <span class="rs-dot"></span>
        <span class="label">{t(s.labelKey)}</span>
        {#if n > 0}
          <span class="rs-count" data-test={`list-count-${s.id}`}>{n}</span>
        {/if}
      </button>
    {/each}
  </nav>
  </div>

  <div class="footer">
    <span class="status-text" data-test="sidebar-version">Aan{version ? ` ${version}` : ''}</span>
    <button
      class="kbd-btn"
      onclick={toggleShortcuts}
      use:tooltip={t('shortcuts.title')}
      aria-label={t('shortcuts.title')}
      data-test="sidebar-shortcuts"
    >?</button>
  </div>
</aside>

<style>
  .sidebar {
    width: 220px;
    min-width: 220px;
    background: var(--chrome-bg);
    backdrop-filter: blur(24px) saturate(1.4);
    border-right: 1px solid var(--border-soft);
    display: flex;
    flex-direction: column;
    padding: 18px 0 0;
    user-select: none;
    transition: width 0.22s var(--ease-out), min-width 0.22s var(--ease-out);
  }
  .sidebar.collapsed { width: 58px; min-width: 58px; }
  .scroll-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    scrollbar-gutter: stable;
    padding-bottom: 16px;
  }
  .scroll-area::-webkit-scrollbar { width: 6px; }
  .scroll-area::-webkit-scrollbar-track { background: transparent; }
  .scroll-area::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
    transition: background 0.2s var(--ease-out);
  }
  .scroll-area:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); }
  .scroll-area:hover::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }
  .sidebar.collapsed .label,
  .sidebar.collapsed .sec-label,
  .sidebar.collapsed .status-text { display: none; }
  .sidebar.collapsed .nav-item { justify-content: center; padding: 10px; }
  .sidebar.collapsed .footer { justify-content: center; padding: 14px 0; }
  .sidebar.collapsed .sec-row { justify-content: center; padding: 0 0 10px; }

  .sec-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 12px 10px 20px;
  }
  .sec-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
    color: var(--text3);
  }
  .collapse-btn {
    width: 24px; height: 24px; border-radius: 6px;
    display: grid; place-items: center;
    color: var(--text3);
    background: transparent;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .collapse-btn:hover { background: var(--hover-bg); color: var(--text);}
  nav { display: flex; flex-direction: column; gap: 2px; padding: 0 10px; }
  .lists-divider {
    margin: 14px 16px 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-soft) 30%, var(--border-soft) 70%, transparent);
  }
  .lists-head { padding: 12px 12px 6px 20px; }
  .lists-nav { gap: 1px; padding: 0 8px; }
  .list-item {
    padding: 6px 10px;
    gap: 10px;
    font-size: 12px; font-weight: 500;
    color: var(--text2);
  }
  .list-item:hover {
    background: color-mix(in srgb, var(--rs) 12%, transparent);
    color: var(--text);
  }
  .list-item.active {
    background: color-mix(in srgb, var(--rs) 18%, transparent);
    color: var(--text); font-weight: 600;
  }
  .list-item.active::before {
    background: var(--rs);
    box-shadow: 0 0 8px var(--rs);
    top: 5px; bottom: 5px;
  }
  .list-item .rs-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--rs);
    box-shadow: 0 0 6px color-mix(in srgb, var(--rs) 70%, transparent);
    flex-shrink: 0;
  }
  .rs-count {
    font-size: 10px; font-weight: 700;
    padding: 1px 7px; border-radius: 9999px;
    background: var(--hover-bg); color: var(--text3);
    font-variant-numeric: tabular-nums;
  }
  .list-item.active .rs-count {
    background: color-mix(in srgb, var(--rs) 22%, transparent);
    color: var(--text);
  }
  .sidebar.collapsed .lists-head,
  .sidebar.collapsed .rs-count { display: none; }
  /* Extra margin in collapsed mode since the section header is hidden. */
  .sidebar.collapsed .lists-divider {
    margin: 14px 14px 8px;
  }
  .sidebar.collapsed .lists-nav { padding-top: 2px; }
  .sidebar.collapsed .list-item { justify-content: center; padding: 6px 0; }
  .nav-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 8px;
    color: var(--sidebar-text);
    font-size: 13px; font-weight: 500;
    text-align: left; width: 100%; position: relative;
    transition:
      background 0.18s var(--ease-out),
      color 0.18s var(--ease-out),
      transform 0.18s var(--ease-out);
  }
  .nav-item:hover { background: var(--hover-bg); color: var(--text);}
  .nav-item:active { transform: scale(0.98); }
  .nav-item.active {
    background: linear-gradient(90deg, var(--accent-dim), transparent 80%);
    color: var(--sidebar-hi); font-weight: 600;
  }
  .nav-item.active::before {
    content: ''; position: absolute;
    left: -10px; top: 8px; bottom: 8px; width: 3px;
    background: var(--accent); border-radius: 0 3px 3px 0;
    box-shadow: 0 0 8px var(--accent-glow);
  }
  .icon {
    display: inline-flex; position: relative;
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .nav-item:hover .icon { transform: scale(1.12); }
  .nav-item.active .icon { transform: scale(1.06); }
  .label { flex: 1; }
  .footer {
    margin-top: auto;
    padding: 14px 20px;
    border-top: 1px solid var(--border-soft);
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: var(--text2);
  }
  .status-text { flex: 1; }
  .kbd-btn {
    width: 22px; height: 22px;
    display: grid; place-items: center;
    border-radius: 6px;
    background: var(--hover-bg);
    color: var(--text2);
    font-size: 11px; font-weight: 700;
    font-family: var(--font-mono);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .kbd-btn:hover { background: var(--accent-dim); color: var(--text); }
  .sidebar.collapsed .kbd-btn { display: none; }
</style>
