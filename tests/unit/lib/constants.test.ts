import { describe, it, expect } from 'vitest';
import {
  NAV_ITEMS,
  LIBRARY_FILTERS,
  TYPE_CHIP,
  STATUS_KEY,
  READING_STATUSES,
  UI_FONTS,
  NOVEL_FONTS,
  FONT_SIZE_UI,
  FONT_SIZE_NOVEL,
  ANIM,
} from '../../../src/shared/lib/constants';

describe('NAV_ITEMS', () => {
  it('includes the canonical pages', () => {
    const ids = NAV_ITEMS.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['home', 'library', 'favorites', 'history', 'settings']));
  });

  it('each entry has a labelKey + icon', () => {
    for (const n of NAV_ITEMS) {
      expect(n.labelKey).toBeTruthy();
      expect(n.icon).toBeTruthy();
    }
  });
});

describe('LIBRARY_FILTERS', () => {
  it('starts with "all" and covers each kind', () => {
    expect(LIBRARY_FILTERS[0].id).toBe('all');
    const ids = LIBRARY_FILTERS.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['manga', 'comic', 'novel', 'original_novel']));
  });
});

describe('TYPE_CHIP', () => {
  it('has each canonical kind', () => {
    for (const k of ['manga', 'comic', 'novel', 'original_novel']) {
      expect(TYPE_CHIP[k]).toBeDefined();
      expect(TYPE_CHIP[k].labelKey).toBeTruthy();
    }
  });
});

describe('STATUS_KEY', () => {
  it('maps 0/1/2', () => {
    expect(STATUS_KEY[0]).toMatch(/unknown/);
    expect(STATUS_KEY[1]).toMatch(/ongoing/);
    expect(STATUS_KEY[2]).toMatch(/completed/);
  });
});

describe('READING_STATUSES', () => {
  it('lists the 5 user statuses', () => {
    const ids = READING_STATUSES.map((r) => r.id).sort();
    expect(ids).toEqual(['completed', 'dropped', 'on_hold', 'plan', 'reading']);
  });
});

describe('font tables', () => {
  it('UI_FONTS first entry is the default sentinel', () => {
    expect(UI_FONTS[0].value).toBe('');
  });
  it('NOVEL_FONTS first entry is the inherit sentinel', () => {
    expect(NOVEL_FONTS[0].value).toBe('');
  });
  it('FONT_SIZE_UI bounds are sane', () => {
    expect(FONT_SIZE_UI.min).toBeLessThan(FONT_SIZE_UI.default);
    expect(FONT_SIZE_UI.default).toBeLessThan(FONT_SIZE_UI.max);
  });
  it('FONT_SIZE_NOVEL bounds are sane', () => {
    expect(FONT_SIZE_NOVEL.min).toBeLessThan(FONT_SIZE_NOVEL.default);
    expect(FONT_SIZE_NOVEL.default).toBeLessThan(FONT_SIZE_NOVEL.max);
  });
});

describe('ANIM', () => {
  it('exports stagger numbers', () => {
    expect(ANIM.cardStaggerMs).toBeGreaterThan(0);
    expect(ANIM.pageFadeMs).toBeGreaterThan(0);
  });
});
