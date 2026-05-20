<script lang="ts">
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Icon from '../../../shared/components/Icon.svelte';
  import { t } from '../../../shared/lib/i18n.svelte';
  import { app, setTheme } from '../../../shared/lib/store.svelte';

  type Props = {
    open: boolean;
    searching: boolean;
    query: string;
    onToggle: () => void;
  };
  let { open, searching, query, onToggle }: Props = $props();

  type ThemeId = 'dark' | 'light' | 'sepia' | 'oled' | 'dim';
  const THEMES: { id: ThemeId; labelKey: string; swatch: string; accent: string; group: 'light' | 'dark' }[] = [
    { id: 'light', labelKey: 'settings.theme.light', swatch: '#f8f7f2', accent: '#7c3aed', group: 'light' },
    { id: 'sepia', labelKey: 'settings.theme.sepia', swatch: '#f3ead7', accent: '#8b5a2b', group: 'light' },
    { id: 'dim',   labelKey: 'settings.theme.dim',   swatch: '#1e1e2a', accent: '#a78bfa', group: 'dark'  },
    { id: 'dark',  labelKey: 'settings.theme.dark',  swatch: '#111827', accent: '#8b5cf6', group: 'dark'  },
    { id: 'oled',  labelKey: 'settings.theme.oled',  swatch: '#000000', accent: '#a78bfa', group: 'dark'  },
  ];

  const qLower = $derived(query.trim().toLowerCase());
  function matches(...keys: string[]): boolean {
    if (!qLower) return true;
    return keys.some((k) => k && k.toLowerCase().includes(qLower));
  }
  const visTheme = $derived(matches(t('settings.theme.title'), t('settings.theme.desc')));
</script>

{#if !searching || visTheme}
  <section class="group" class:open data-test="settings-section-appearance">
    <button class="group-head" onclick={onToggle} disabled={searching}>
      <span class="sec-icon"><Icon name="palette" size={14} /></span>
      <h2>{t('settings.section.appearance')}</h2>
      <span class="caret" class:up={open}><Icon name="chevron_down" size={12} /></span>
    </button>
    {#if open}
      <div class="group-body" transition:slide={{ duration: 220, easing: cubicOut }}>
        {#if visTheme}
          <div class="row">
            <div class="label">
              <div class="title">{t('settings.theme.title')}</div>
              <div class="desc">{t('settings.theme.desc')}</div>
            </div>
            <div class="theme-pick">
              <div class="theme-group">
                <span class="theme-group-label">
                  <Icon name="sun" size={10} />
                  {t('settings.theme.group.light')}
                </span>
                <div class="theme-row">
                  {#each THEMES.filter((th) => th.group === 'light') as th (th.id)}
                    <button
                      class="theme-btn"
                      class:active={app.theme === th.id}
                      onclick={() => setTheme(th.id)}
                      style:--swatch={th.swatch}
                      style:--accent={th.accent}
                      data-test={`theme-${th.id}`}
                    >
                      <span class="theme-swatch"></span>
                      {#if app.theme === th.id}<Icon name="check" size={11} />{/if}
                      {t(th.labelKey)}
                    </button>
                  {/each}
                </div>
              </div>
              <div class="theme-group">
                <span class="theme-group-label">
                  <Icon name="moon" size={10} />
                  {t('settings.theme.group.dark')}
                </span>
                <div class="theme-row">
                  {#each THEMES.filter((th) => th.group === 'dark') as th (th.id)}
                    <button
                      class="theme-btn"
                      class:active={app.theme === th.id}
                      onclick={() => setTheme(th.id)}
                      style:--swatch={th.swatch}
                      style:--accent={th.accent}
                      data-test={`theme-${th.id}`}
                    >
                      <span class="theme-swatch"></span>
                      {#if app.theme === th.id}<Icon name="check" size={11} />{/if}
                      {t(th.labelKey)}
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .theme-pick {
    display: flex; flex-direction: column; gap: 10px;
    align-items: flex-end;
  }
  .theme-group {
    display: flex; flex-direction: column; gap: 5px;
    align-items: flex-end;
  }
  .theme-group-label {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text3);
  }
  .theme-row { display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .theme-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 9999px;
    border: 1px solid var(--border);
    background: transparent; color: var(--text2);
    font-size: 11px; font-weight: 500;
    will-change: transform;
    transition:
      background 0.18s var(--ease-out),
      border-color 0.18s var(--ease-out),
      color 0.18s var(--ease-out),
      box-shadow 0.28s var(--ease-out),
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .theme-btn:hover:not(.active) {
    background: var(--surface2);
    color: var(--text);
    transform: translateY(-1px);
  }
  .theme-btn:active:not(.active) { transform: scale(0.96); }
  .theme-btn.active {
    background: var(--accent); border-color: var(--accent);
    color: #fff; font-weight: 600;
    box-shadow: 0 6px 16px -6px var(--accent-glow);
    transform: scale(1.08);
  }
  .theme-btn.active :global(svg) {
    animation: theme-check-pop 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes theme-check-pop {
    from { opacity: 0; transform: scale(0.4); }
    to   { opacity: 1; transform: scale(1); }
  }
  .theme-swatch {
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--swatch);
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.06),
      0 0 0 1.5px var(--accent);
    flex-shrink: 0;
  }
  .theme-btn.active .theme-swatch {
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,0.15),
      0 0 0 1.5px #fff;
  }
</style>
