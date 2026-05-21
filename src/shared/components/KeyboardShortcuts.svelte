<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import Icon from './Icon.svelte';
  import { portal } from '../lib/portal';

  type Props = { open: boolean; onClose: () => void };
  let { open, onClose }: Props = $props();

  type Row = { keys: string[]; label: string };
  type Section = { title: string; rows: Row[] };

  const sections: Section[] = [
    {
      title: 'shortcuts.section.global',
      rows: [
        { keys: ['?'], label: 'shortcuts.show' },
        { keys: ['Esc'], label: 'shortcuts.close_back' },
        { keys: ['R'], label: 'shortcuts.resume' },
      ],
    },
    {
      title: 'shortcuts.section.manga',
      rows: [
        { keys: ['→', 'PgDn', 'Space'], label: 'shortcuts.next_page' },
        { keys: ['←', 'PgUp'], label: 'shortcuts.prev_page' },
        { keys: ['↓'], label: 'shortcuts.scroll_down' },
        { keys: ['↑'], label: 'shortcuts.scroll_up' },
        { keys: ['Home'], label: 'shortcuts.first_page' },
        { keys: ['End'], label: 'shortcuts.last_page' },
        { keys: ['B'], label: 'shortcuts.bookmark' },
      ],
    },
    {
      title: 'shortcuts.section.novel',
      rows: [
        { keys: ['A−', 'A+'], label: 'shortcuts.font_size' },
      ],
    },
  ];

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
</script>

{#if open}
  <div
    class="backdrop"
    role="button"
    tabindex="-1"
    onclick={onBackdrop}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    use:portal
    data-test="shortcuts-backdrop"
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="kbd-title" data-test="shortcuts-dialog">
      <header class="head">
        <h2 id="kbd-title">{t('shortcuts.title')}</h2>
        <button class="close" onclick={onClose} aria-label="Close" data-test="shortcuts-close">
          <Icon name="x" size={14} />
        </button>
      </header>
      <div class="grid">
        {#each sections as sec (sec.title)}
          <section class="section" data-test={`shortcuts-section-${sec.title.split('.').pop()}`}>
            <h3>{t(sec.title)}</h3>
            <ul>
              {#each sec.rows as r (r.label)}
                <li>
                  <span class="keys">
                    {#each r.keys as k, i (k + i)}
                      {#if i > 0}<span class="sep">·</span>{/if}
                      <kbd>{k}</kbd>
                    {/each}
                  </span>
                  <span class="lbl">{t(r.label)}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
      <footer class="foot">
        <span class="hint">{t('shortcuts.hint')}</span>
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 100;
    display: grid; place-items: center;
    background: var(--scrim-bg);
    animation: fade 0.18s var(--ease-out);
  }
  @keyframes fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .modal {
    width: min(680px, 92vw);
    max-height: 86vh; overflow-y: auto;
    background: var(--panel-bg);
    backdrop-filter: var(--panel-blur);
    -webkit-backdrop-filter: var(--panel-blur);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    box-shadow: var(--panel-shadow);
    animation: pop 0.2s var(--ease-out);
  }
  @keyframes pop {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-soft);
  }
  .head h2 {
    font-size: 14px; font-weight: 700; letter-spacing: 0.04em;
    color: var(--text);
  }
  .close {
    width: 28px; height: 28px;
    display: grid; place-items: center;
    border-radius: 8px;
    background: var(--hover-bg); color: var(--text2);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .close:hover { background: var(--accent-dim); color: var(--text); }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 18px;
    padding: 18px 20px;
  }
  .section h3 {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text3);
    margin-bottom: 10px;
  }
  .section ul {
    list-style: none; padding: 0; margin: 0;
    display: flex; flex-direction: column; gap: 6px;
  }
  .section li {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px;
  }
  .keys { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .sep { color: var(--text3); font-size: 10px; }
  .lbl { font-size: 11px; color: var(--text2); text-align: right; }
  kbd {
    display: inline-block;
    min-width: 22px;
    padding: 2px 7px;
    font-family: var(--font-mono);
    font-size: 11px; font-weight: 600;
    color: var(--text);
    background: var(--surface2);
    border: 1px solid var(--border);
    border-bottom-width: 2px;
    border-radius: 5px;
    text-align: center;
    line-height: 1.3;
  }
  .foot {
    padding: 10px 20px 16px;
    border-top: 1px solid var(--border-soft);
  }
  .hint { font-size: 11px; color: var(--text3); }
</style>
