<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import Modal from './ui/Modal.svelte';

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


</script>

<Modal {open} {onClose} title={t('shortcuts.title')} size="lg" testId="shortcuts-dialog">
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
  {#snippet footer()}
    <span class="hint">{t('shortcuts.hint')}</span>
  {/snippet}
</Modal>

<style>
  .grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 18px;
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
  .hint { font-size: 11px; color: var(--text3); }
</style>
