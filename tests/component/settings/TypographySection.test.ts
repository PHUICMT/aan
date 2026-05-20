import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import TypographySection from '../../../src/features/settings/sections/TypographySection.svelte';
import { app } from '../../../src/shared/lib/store.svelte';

describe('TypographySection', () => {
  it('renders two range sliders (UI + novel)', () => {
    const { container } = render(TypographySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    expect(container.querySelectorAll('input[type="range"].slider').length).toBe(2);
  });

  it('UI slider min/max match the clamp range (11..18)', () => {
    const { container } = render(TypographySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    const sliders = container.querySelectorAll('input[type="range"]') as NodeListOf<HTMLInputElement>;
    const ui = sliders[0];
    expect(ui.min).toBe('11');
    expect(ui.max).toBe('18');
  });

  it('changing the UI slider updates app.fontUiSize within clamp range', async () => {
    const { container } = render(TypographySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    const ui = container.querySelectorAll('input[type="range"]')[0] as HTMLInputElement;
    ui.value = '16';
    await fireEvent.input(ui);
    flushSync();
    expect(app.fontUiSize).toBe(16);
  });

  it('out-of-range slider input gets clamped by the setter', async () => {
    const { container } = render(TypographySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    const novel = container.querySelectorAll('input[type="range"]')[1] as HTMLInputElement;
    // jsdom won't enforce the input range; verify the setter clamp itself.
    novel.value = '999';
    await fireEvent.input(novel);
    flushSync();
    expect(app.fontNovelSize).toBeLessThanOrEqual(28);
    expect(app.fontNovelSize).toBeGreaterThanOrEqual(14);
  });

  it('preview block is hidden while searching', () => {
    const r1 = render(TypographySection, {
      props: { open: true, searching: true, query: 'font', onToggle: () => {} },
    });
    expect(r1.container.querySelector('.preview')).toBeNull();
    r1.unmount();
    const r2 = render(TypographySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    expect(r2.container.querySelector('.preview')).not.toBeNull();
  });
});
