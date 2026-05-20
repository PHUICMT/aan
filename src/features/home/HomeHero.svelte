<script lang="ts">
  import { tooltip } from '../../shared/lib/tooltip';
  import Icon from '../../shared/components/Icon.svelte';
  import { TYPE_CHIP } from '../../shared/lib/constants';
  import { t } from '../../shared/lib/i18n.svelte';
  import type { RecentRead } from '../../shared/lib/types';

  type Props = {
    hero: RecentRead;
    coverUrl?: string;
    onResume: () => void;
  };

  let { hero, coverUrl, onResume }: Props = $props();

  const chip = $derived(TYPE_CHIP[hero.kind] ?? TYPE_CHIP.manga);
  const pct = $derived(
    hero.page_count
      ? Math.min(100, Math.round((hero.last_page_read / hero.page_count) * 100))
      : 0,
  );
</script>

<button class="hero-card" onclick={onResume}>
  {#if coverUrl}
    <img class="hero-bg" src={coverUrl} alt="" aria-hidden="true" />
  {/if}
  <div class="hero-overlay"></div>
  <div class="hero-inner">
    <div class="hero-cover">
      {#if coverUrl}
        <img src={coverUrl} alt={hero.series_name} />
      {:else}
        <div class="cover-fallback">{hero.series_name.charAt(0)}</div>
      {/if}
    </div>
    <div class="hero-body">
      <div class="hero-eyebrow">
        <span class="chip-mini" style:background={chip.bg} style:color={chip.fg}>
          {t(chip.labelKey)}
        </span>
        <span class="eyebrow-lbl">{t('home.hero.last_read')}</span>
      </div>
      <div class="hero-title" use:tooltip={hero.series_name}>{hero.series_name}</div>
      <div class="hero-meta">{t('series.ch_no')} {hero.chapter_no} · {hero.last_page_read}/{hero.page_count} pages</div>
      <div class="hero-progress">
        <div class="hero-progress-fill" style:width="{pct}%"></div>
      </div>
    </div>
    <div class="hero-cta">
      <span class="cta-pill">
        <Icon name="chevron_right" size={14} />
        {t('home.hero.continue')}
      </span>
    </div>
  </div>
</button>

<style>
  .hero-card {
    position: relative;
    width: 100%;
    display: block;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid var(--border);
    background: linear-gradient(135deg, var(--surface2), rgba(255,255,255,0.02));
    margin-bottom: 18px;
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
      border-color 0.3s var(--ease-out),
      box-shadow 0.35s var(--ease-out);
  }
  .hero-card::before {
    content: '';
    position: absolute; inset: -1px;
    border-radius: 18px;
    padding: 1px;
    background: linear-gradient(
      120deg,
      transparent 20%,
      rgba(139, 92, 246, 0.7) 50%,
      rgba(196, 181, 253, 0.55) 65%,
      transparent 80%
    );
    background-size: 250% 100%;
    background-position: 100% 0;
    -webkit-mask: linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff);
    mask: linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.35s var(--ease-out), background-position 1.4s var(--ease-out);
    pointer-events: none;
    z-index: 2;
  }
  .hero-card:hover {
    transform: translateY(-3px);
    border-color: transparent;
    box-shadow:
      0 18px 44px -8px rgba(139, 92, 246, 0.32),
      0 8px 20px rgba(0, 0, 0, 0.30);
  }
  .hero-card:hover::before {
    opacity: 1;
    background-position: 0 0;
  }
  .hero-bg {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    filter: blur(40px) saturate(140%);
    opacity: 0.55;
    transform: scale(1.1);
    pointer-events: none;
    transition: opacity 0.4s var(--ease-out), transform 1.2s var(--ease-out), filter 0.4s var(--ease-out);
  }
  .hero-card:hover .hero-bg {
    opacity: 0.72;
    transform: scale(1.14);
    filter: blur(36px) saturate(160%);
  }
  .hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%);
    pointer-events: none;
    transition: background 0.35s var(--ease-out);
  }
  .hero-card:hover .hero-overlay {
    background: linear-gradient(135deg, rgba(0,0,0,0.40) 0%, rgba(20,5,50,0.65) 100%);
  }
  .hero-inner {
    position: relative;
    display: flex; align-items: center; gap: 22px;
    padding: 22px 26px;
  }
  .hero-cover {
    flex-shrink: 0;
    width: 100px; height: 144px;
    border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    background: #14182a;
    box-shadow: 0 10px 28px rgba(0,0,0,0.5);
    transition: box-shadow 0.35s var(--ease-out), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .hero-card:hover .hero-cover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.4);
  }
  .hero-cover img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .hero-card:hover .hero-cover img { transform: scale(1.06); }
  .cover-fallback {
    width: 100%; height: 100%; display: grid; place-items: center;
    background: linear-gradient(135deg, #1a0f3e, #2d1f5e);
    font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.4);
  }
  .hero-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .hero-eyebrow { display: flex; align-items: center; gap: 8px; }
  .chip-mini {
    align-self: flex-start;
    padding: 1px 7px; border-radius: 9999px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  }
  .eyebrow-lbl {
    font-size: 10px; font-weight: 700; letter-spacing: 0.10em;
    text-transform: uppercase; color: rgba(255,255,255,0.65);
  }
  .hero-title {
    font-size: 22px; font-weight: 700; color: #fff;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    line-height: 1.2;
  }
  .hero-meta { font-size: 12px; color: rgba(255,255,255,0.75); }
  .hero-progress {
    margin-top: 4px;
    height: 5px; border-radius: 9999px;
    background: rgba(255,255,255,0.15);
    overflow: hidden;
  }
  .hero-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #a78bfa);
    transition: width 0.4s var(--ease-out);
  }
  .hero-cta { flex-shrink: 0; }
  .cta-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 10px 18px 10px 14px;
    border-radius: 9999px;
    background: #fff; color: #1a0f3e;
    font-size: 13px; font-weight: 700;
    box-shadow: 0 6px 18px rgba(0,0,0,0.25);
    transition: box-shadow 0.18s var(--ease-out), background 0.18s var(--ease-out);
  }
  .hero-card:hover .cta-pill {
    background: #f5f3ff;
    box-shadow: 0 10px 26px rgba(139, 92, 246, 0.35), 0 0 0 4px rgba(139, 92, 246, 0.15);
  }
  @media (max-width: 720px) {
    .hero-inner { flex-direction: column; align-items: flex-start; gap: 14px; }
    .hero-cta { align-self: stretch; }
    .cta-pill { width: 100%; justify-content: center; }
  }
</style>
