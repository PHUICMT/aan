<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../shared/components/Icon.svelte';
  import { t } from '../../shared/lib/i18n.svelte';
  import { tooltip } from '../../shared/lib/tooltip';
  import DataFolderSection from './DataFolderSection.svelte';
  import GeneralSection from './sections/GeneralSection.svelte';
  import AppearanceSection from './sections/AppearanceSection.svelte';
  import TypographySection from './sections/TypographySection.svelte';
  import ReaderSection from './sections/ReaderSection.svelte';
  import TraySection from './sections/TraySection.svelte';
  import WatchFoldersSection from './sections/WatchFoldersSection.svelte';
  import ResetSection from './sections/ResetSection.svelte';
  import BackupSection from './sections/BackupSection.svelte';
  import DictionariesSection from './sections/DictionariesSection.svelte';
  import TagsSection from './sections/TagsSection.svelte';

  //───── Collapse + search ─────
  type SectionId =
    | 'general' | 'appearance' | 'typography' | 'reader'
    | 'datafolder' | 'watch' | 'auto' | 'tags' | 'dicts' | 'backup' | 'reset';
  const SECTION_IDS: SectionId[] = [
    'general', 'appearance', 'typography', 'reader',
    'datafolder', 'watch', 'auto', 'tags', 'dicts', 'backup', 'reset',
  ];

  function loadCollapsed(): Record<SectionId, boolean> {
    const out = {} as Record<SectionId, boolean>;
    for (const id of SECTION_IDS) {
      try { out[id] = localStorage.getItem(`aan.settings.collapsed.${id}`) === '1'; }
      catch { out[id] = false; }
    }
    return out;
  }
  let collapsed = $state(loadCollapsed());
  function toggle(id: SectionId) {
    collapsed[id] = !collapsed[id];
    try { localStorage.setItem(`aan.settings.collapsed.${id}`, collapsed[id] ? '1' : '0'); } catch {}
  }
  function collapseAll() {
    for (const id of SECTION_IDS) {
      collapsed[id] = true;
      try { localStorage.setItem(`aan.settings.collapsed.${id}`, '1'); } catch {}
    }
  }
  function expandAll() {
    for (const id of SECTION_IDS) {
      collapsed[id] = false;
      try { localStorage.setItem(`aan.settings.collapsed.${id}`, '0'); } catch {}
    }
  }

  let q = $state('');
  const qLower = $derived(q.trim().toLowerCase());
  const searching = $derived(qLower.length > 0);
  function matches(...keys: string[]): boolean {
    if (!qLower) return true;
    return keys.some((k) => k && k.toLowerCase().includes(qLower));
  }

  // Mirror predicates so the orchestrator knows whether *any* section is
  // visible (for the no-results fallback). Sections themselves recompute
  // these internally to drive their own visibility.
  const visLang = $derived(matches(t('settings.lang.title'), t('settings.lang.desc')));
  const visTheme = $derived(matches(t('settings.theme.title'), t('settings.theme.desc')));
  const visFontUi = $derived(matches(t('settings.font.ui.title'), t('settings.font.ui.desc')));
  const visFontUiSize = $derived(matches(t('settings.font.ui.size')));
  const visFontNovel = $derived(matches(t('settings.font.novel.title'), t('settings.font.novel.desc')));
  const visFontNovelSize = $derived(matches(t('settings.font.novel.size')));
  const visDataFolder = $derived(matches(t('settings.section.data_folder'), 'ย้ายข้อมูล', 'data folder', 'path'));
  const visWatch = $derived(matches(t('settings.section.watch'), t('settings.watch.desc'), 'watch', 'monitor', 'เฝ้า'));
  const visTray = $derived(matches(t('settings.tray.close_to_tray.title'), t('settings.tray.close_to_tray.desc')));
  const visReset = $derived(matches(t('settings.reset.title'), t('settings.reset.desc')));
  const visBackup = $derived(matches(t('settings.section.backup'), t('settings.backup.desc'), 'backup', 'restore', 'สำรอง'));
  const visDicts  = $derived(matches(t('settings.section.dicts'), t('settings.dicts.desc'), 'dictionary', 'พจนานุกรม', 'lookup'));
  const visTags   = $derived(matches(t('settings.section.tags'), t('settings.tags.desc'), 'tag', 'แท็ก'));
  const visReader = $derived(matches(t('settings.section.reader'), t('reader.pdf_load.title'), t('reader.pdf_load.desc'), 'pdf', 'lazy', 'eager'));

  const secVisGeneral    = $derived(!searching || visLang);
  const secVisAppearance = $derived(!searching || visTheme);
  const secVisTypography = $derived(!searching || (visFontUi || visFontUiSize || visFontNovel || visFontNovelSize));
  const secVisDataFolder = $derived(!searching || visDataFolder);
  const secVisWatch      = $derived(!searching || visWatch);
  const secVisAuto       = $derived(!searching || visTray);
  const secVisReset      = $derived(!searching || visReset);
  const secVisBackup     = $derived(!searching || visBackup);
  const secVisDicts      = $derived(!searching || visDicts);
  const secVisTags       = $derived(!searching || visTags);
  const secVisReader     = $derived(!searching || visReader);

  // Force-expand sections while searching so hits are always visible.
  const openGeneral    = $derived(searching || !collapsed.general);
  const openAppearance = $derived(searching || !collapsed.appearance);
  const openTypography = $derived(searching || !collapsed.typography);
  const openDataFolder = $derived(searching || !collapsed.datafolder);
  const openWatch      = $derived(searching || !collapsed.watch);
  const openAuto       = $derived(searching || !collapsed.auto);
  const openReset      = $derived(searching || !collapsed.reset);
  const openBackup     = $derived(searching || !collapsed.backup);
  const openDicts      = $derived(searching || !collapsed.dicts);
  const openTags       = $derived(searching || !collapsed.tags);
  const openReader     = $derived(searching || !collapsed.reader);

  const anyVisible = $derived(
    !searching ||
    secVisGeneral || secVisAppearance || secVisTypography ||
    secVisDataFolder || secVisWatch || secVisAuto || secVisTags || secVisReader || secVisDicts || secVisBackup || secVisReset,
  );
</script>

<div class="page settings-page">
  <header class="page-head">
    <h1>{t('settings.title')}</h1>
    <div class="head-controls">
      <div class="search-wrap">
        <span class="search-icon"><Icon name="search" size={12} /></span>
        <input
          type="search"
          class="search"
          placeholder={t('settings.search.placeholder')}
          bind:value={q}
        />
        {#if q}
          <button class="clear" type="button" onclick={() => (q = '')} aria-label="Clear search">
            <Icon name="x" size={10} />
          </button>
        {/if}
      </div>
      {#if !searching}
        <button class="head-btn" type="button" onclick={expandAll} use:tooltip={"Expand all"} data-test="settings-expand-all">
          <Icon name="chevron_down" size={10} />
        </button>
        <button class="head-btn" type="button" onclick={collapseAll} use:tooltip={"Collapse all"} data-test="settings-collapse-all">
          <Icon name="minus" size={10} />
        </button>
      {/if}
    </div>
  </header>

  <GeneralSection
    open={openGeneral}
    {searching}
    query={q}
    onToggle={() => toggle('general')}
  />

  <AppearanceSection
    open={openAppearance}
    {searching}
    query={q}
    onToggle={() => toggle('appearance')}
  />

  <TypographySection
    open={openTypography}
    {searching}
    query={q}
    onToggle={() => toggle('typography')}
  />

  {#if secVisDataFolder}
    <section class="group" class:open={openDataFolder} class:nested-section={true} data-test="settings-section-datafolder">
      <button class="group-head" onclick={() => toggle('datafolder')} disabled={searching}>
        <span class="sec-icon"><Icon name="folder" size={14} /></span>
        <h2>{t('settings.section.data_folder')}</h2>
        <span class="caret" class:up={openDataFolder}><Icon name="chevron_down" size={12} /></span>
      </button>
      {#if openDataFolder}
        <div class="group-body data-folder-body" transition:slide={{ duration: 220, easing: cubicOut }}>
          <DataFolderSection />
        </div>
      {/if}
    </section>
  {/if}

  {#if secVisWatch}
    <WatchFoldersSection
      open={openWatch}
      {searching}
      query={q}
      onToggle={() => toggle('watch')}
    />
  {/if}

  <TraySection
    open={openAuto}
    {searching}
    query={q}
    onToggle={() => toggle('auto')}
  />

  {#if secVisReader}
    <ReaderSection
      open={openReader}
      {searching}
      query={q}
      onToggle={() => toggle('reader')}
    />
  {/if}

  {#if secVisTags}
    <TagsSection
      open={openTags}
      {searching}
      query={q}
      onToggle={() => toggle('tags')}
    />
  {/if}

  {#if secVisDicts}
    <DictionariesSection
      open={openDicts}
      {searching}
      query={q}
      onToggle={() => toggle('dicts')}
    />
  {/if}

  {#if secVisBackup}
    <BackupSection
      open={openBackup}
      {searching}
      query={q}
      onToggle={() => toggle('backup')}
    />
  {/if}

  <ResetSection
    open={openReset}
    {searching}
    query={q}
    onToggle={() => toggle('reset')}
  />

  {#if !anyVisible}
    <div class="no-results">
      <Icon name="search" size={20} />
      <p>{t('settings.search.no_results').replace('{q}', q)}</p>
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 28px 40px 40px; height: 100%; overflow-y: auto;
    /* Reserve scrollbar gutter so expanding a section doesn't shift content. */
    scrollbar-gutter: stable;
  }
  .page-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; margin-bottom: 24px;
    flex-wrap: wrap;
  }
  h1 {
    font-size: 26px; font-weight: 700;
    background: linear-gradient(135deg, var(--heading-grad-from) 0%, var(--heading-grad-to) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
  }
  .head-controls { display: inline-flex; align-items: center; gap: 8px; }
  .search-wrap {
    position: relative;
    display: inline-flex; align-items: center;
  }
  .search-icon {
    position: absolute; left: 10px;
    color: var(--text3);
    pointer-events: none;
    display: inline-flex;
  }
  .search {
    width: 260px;
    padding: 7px 28px 7px 30px;
    background: var(--surface2); color: var(--text);
    border: 1px solid var(--border);
    border-radius: 9999px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s var(--ease-out);
  }
  .search:focus { border-color: var(--accent); }
  .search::placeholder { color: var(--text3); }
  .clear {
    position: absolute; right: 8px;
    width: 18px; height: 18px; border-radius: 50%;
    display: grid; place-items: center;
    background: var(--hover-bg); color: var(--text3);
  }
  .clear:hover { background: var(--surface2); color: var(--text); }
  .head-btn {
    width: 28px; height: 28px; border-radius: 8px;
    display: grid; place-items: center;
    background: var(--hover-bg); color: var(--text3);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .head-btn:hover { background: var(--surface2); color: var(--text); }

  /* Shared section shell — applied to .group inside this page AND inside
     child <Section> components via :global(). */
  :global(.settings-page .group) {
    margin-bottom: 14px;
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }
  :global(.settings-page .group-head) {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px;
    background: transparent;
    cursor: pointer;
    border-radius: 14px;
    transition: background 0.15s var(--ease-out);
  }
  :global(.settings-page .group-head:hover:not(:disabled)) { background: var(--hover-bg); }
  :global(.settings-page .group-head:disabled) { cursor: default; }
  :global(.settings-page .group-head h2) {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
    margin: 0;
    flex: 1;
    text-align: left;
  }
  :global(.settings-page .group.open .group-head h2) { color: var(--text2); }
  :global(.settings-page .sec-icon) {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px;
    margin-right: 10px;
    color: var(--text3);
    border-radius: 6px;
    background: var(--hover-bg);
    transition: color 0.15s var(--ease-out), background 0.15s var(--ease-out);
  }
  :global(.settings-page .group.open .sec-icon) { color: var(--accent); background: var(--accent-dim); }
  :global(.settings-page .caret) {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px;
    color: var(--text3);
    transition: transform 0.18s var(--ease-out), color 0.15s var(--ease-out);
  }
  :global(.settings-page .caret.up) { transform: rotate(180deg); color: var(--text2); }
  :global(.settings-page .group-head:disabled .caret) { opacity: 0.3; }
  :global(.settings-page .group-body) {
    padding: 0 20px 14px;
    overflow: hidden;
  }
  /* DataFolderSection has its own .group + <h2>; strip them to avoid
     double-boxing and double-title. */
  :global(.settings-page .data-folder-body .group) {
    margin-bottom: 0;
    background: transparent;
    border: none;
    padding: 0;
  }
  :global(.settings-page .data-folder-body .group > h2) {
    display: none;
  }

  :global(.settings-page .row) {
    display: flex; align-items: center; justify-content: space-between;
    gap: 20px; padding: 12px 0;
    border-bottom: 1px solid var(--border-soft);
  }
  :global(.settings-page .row:last-child) { border-bottom: none; }
  :global(.settings-page .label .title) { font-size: 13px; font-weight: 500; color: var(--text); }
  :global(.settings-page .label .desc)  { font-size: 11px; color: var(--text3); margin-top: 2px; }

  .no-results {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 60px 20px;
    color: var(--text3);
    font-size: 12px;
  }
</style>
