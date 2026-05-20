import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import HomeHero from '../../../src/features/home/HomeHero.svelte';
import { makeRecentRead } from '../helpers';

describe('HomeHero', () => {
  it('renders series name + chapter info from hero prop', () => {
    const hero = makeRecentRead({ series_name: 'My Title', chapter_no: 7, last_page_read: 5, page_count: 20 });
    const { container } = render(HomeHero, { props: { hero, onResume: () => {} } });
    expect(container.querySelector('.hero-title')?.textContent).toBe('My Title');
    expect(container.querySelector('.hero-meta')?.textContent).toContain('7');
    expect(container.querySelector('.hero-meta')?.textContent).toContain('5/20');
  });

  it('progress bar width reflects last_page_read / page_count', () => {
    const hero = makeRecentRead({ last_page_read: 5, page_count: 20 });
    const { container } = render(HomeHero, { props: { hero, onResume: () => {} } });
    const fill = container.querySelector('.hero-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('fires onResume when card clicked', async () => {
    const onResume = vi.fn();
    const { container } = render(HomeHero, { props: { hero: makeRecentRead(), onResume } });
    await fireEvent.click(container.querySelector('button.hero-card') as HTMLButtonElement);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('shows cover image when coverUrl provided, fallback otherwise', () => {
    const hero = makeRecentRead({ series_name: 'Abc' });
    const r1 = render(HomeHero, { props: { hero, coverUrl: 'blob:x', onResume: () => {} } });
    expect(r1.container.querySelector('.hero-cover img')).not.toBeNull();
    r1.unmount();
    const r2 = render(HomeHero, { props: { hero, onResume: () => {} } });
    expect(r2.container.querySelector('.cover-fallback')?.textContent).toBe('A');
  });
});
