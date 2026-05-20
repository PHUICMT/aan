import { describe, it, expect, beforeEach } from 'vitest';
import { setTheme } from '../../../src/shared/lib/store/theme.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('setTheme', () => {
  it('persists to localStorage and updates app.theme', () => {
    setTheme('light');
    expect(app.theme).toBe('light');
    expect(localStorage.getItem('aan.theme')).toBe('light');
  });

  it('writes dataset.theme on next animation frame', async () => {
    setTheme('sepia');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(document.documentElement.dataset.theme).toBe('sepia');
  });

  it('accepts all known themes', () => {
    for (const t of ['dark', 'light', 'sepia', 'oled', 'dim'] as const) {
      setTheme(t);
      expect(app.theme).toBe(t);
    }
  });
});
