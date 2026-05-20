import { describe, it, expect } from 'vitest';
import { ICON_PATHS } from '../../../src/shared/lib/icons';

describe('ICON_PATHS', () => {
  it('exposes core nav icons', () => {
    for (const name of ['book', 'search', 'settings', 'sun', 'heart', 'clock']) {
      expect(ICON_PATHS[name], `missing icon: ${name}`).toBeTruthy();
    }
  });

  it('window-control icons are present', () => {
    for (const name of ['x', 'minus', 'square', 'maximize', 'restore']) {
      expect(ICON_PATHS[name]).toBeTruthy();
    }
  });

  it('reader icons are present', () => {
    for (const name of ['book_open', 'scroll', 'file_text', 'sun', 'moon']) {
      expect(ICON_PATHS[name]).toBeTruthy();
    }
  });

  it('every entry is a non-empty SVG fragment', () => {
    for (const [k, v] of Object.entries(ICON_PATHS)) {
      expect(typeof v, k).toBe('string');
      expect(v.length, k).toBeGreaterThan(0);
      expect(v.includes('<'), k).toBe(true);
    }
  });
});
