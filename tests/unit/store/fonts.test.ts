import { describe, it, expect, beforeEach } from 'vitest';
import { setFontUi, setFontUiSize, setFontNovel, setFontNovelSize } from '../../../src/shared/lib/store/fonts.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  app.fontUi = '';
  app.fontUiSize = 13;
  app.fontNovel = '';
  app.fontNovelSize = 17;
});

describe('setFontUi', () => {
  it('persists family', () => {
    setFontUi('Kanit');
    expect(app.fontUi).toBe('Kanit');
    expect(localStorage.getItem('aan.font.ui')).toBe('Kanit');
  });
});

describe('setFontUiSize', () => {
  it('clamps below min', () => {
    setFontUiSize(5);
    expect(app.fontUiSize).toBe(11);
  });
  it('clamps above max', () => {
    setFontUiSize(99);
    expect(app.fontUiSize).toBe(18);
  });
  it('rounds floats', () => {
    setFontUiSize(13.6);
    expect(app.fontUiSize).toBe(14);
  });
  it('persists', () => {
    setFontUiSize(15);
    expect(localStorage.getItem('aan.font.ui.size')).toBe('15');
  });
});

describe('setFontNovel', () => {
  it('persists family', () => {
    setFontNovel('Sarabun');
    expect(app.fontNovel).toBe('Sarabun');
    expect(localStorage.getItem('aan.font.novel')).toBe('Sarabun');
  });
});

describe('setFontNovelSize', () => {
  it('clamps to [14,28]', () => {
    setFontNovelSize(0);
    expect(app.fontNovelSize).toBe(14);
    setFontNovelSize(99);
    expect(app.fontNovelSize).toBe(28);
  });
  it('persists', () => {
    setFontNovelSize(20);
    expect(localStorage.getItem('aan.font.novel.size')).toBe('20');
  });
});
