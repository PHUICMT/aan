import { describe, it, expect, beforeEach } from 'vitest';
import { setLang } from '../../../src/shared/lib/store/lang.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  app.lang = 'en';
});

describe('setLang', () => {
  it('persists th', () => {
    setLang('th');
    expect(app.lang).toBe('th');
    expect(localStorage.getItem('aan.lang')).toBe('th');
  });

  it('persists en', () => {
    setLang('en');
    expect(app.lang).toBe('en');
    expect(localStorage.getItem('aan.lang')).toBe('en');
  });
});
