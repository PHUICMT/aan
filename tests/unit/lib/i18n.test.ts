import { describe, it, expect, beforeEach } from 'vitest';
import { t, AVAILABLE_LANGS } from '../../../src/shared/lib/i18n.svelte';
import { app } from '../../../src/shared/lib/store.svelte';
import { setLang } from '../../../src/shared/lib/store/lang.svelte';

beforeEach(() => {
  setLang('en');
});

describe('t()', () => {
  it('returns the EN string for a known key', () => {
    expect(t('nav.library')).toBe('Library');
  });

  it('returns the TH string after switching lang', () => {
    setLang('th');
    expect(t('nav.library')).toBe('คลังของฉัน');
  });

  it('falls back to EN when current lang dict lacks the key', () => {
    setLang('th');
    // bogus key never appears in either dict — falls through to key itself.
    expect(t('___missing_key___')).toBe('___missing_key___');
  });

  it('returns key verbatim when truly unknown in all dicts', () => {
    expect(t('zzz.nope')).toBe('zzz.nope');
  });

  it('honours app.lang directly', () => {
    app.lang = 'en';
    expect(t('nav.library')).toBe('Library');
  });
});

describe('AVAILABLE_LANGS', () => {
  it('lists en + th', () => {
    expect(AVAILABLE_LANGS.map((l) => l.id).sort()).toEqual(['en', 'th']);
  });
});
