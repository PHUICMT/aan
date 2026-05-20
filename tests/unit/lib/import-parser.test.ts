import { describe, it, expect } from 'vitest';
import { parseImportFilename, groupByseries } from '../../../src/shared/lib/import-parser';

describe('parseImportFilename', () => {
  it('parses "Series Name - 045.pdf"', () => {
    const r = parseImportFilename('One Piece - 045.pdf');
    expect(r.suggestedSeries).toBe('One Piece');
    expect(r.chapterNo).toBe(45);
  });

  it('parses underscore separator', () => {
    const r = parseImportFilename('One_Piece_Ch.5.pdf');
    expect(r.suggestedSeries).toBe('One Piece');
    expect(r.chapterNo).toBe(5);
  });

  it('parses fractional chapter (5.5)', () => {
    const r = parseImportFilename('Series - Ch.5.5.pdf');
    expect(r.chapterNo).toBe(5.5);
  });

  it('parses "Chapter 03" with subtitle', () => {
    const r = parseImportFilename('Series Name Chapter 03 - Subtitle.pdf');
    expect(r.suggestedSeries).toBe('Series Name');
    expect(r.chapterNo).toBe(3);
    expect(r.chapterTitle).toContain('Subtitle');
  });

  it('drops "Vol N" markers from the series guess', () => {
    const r = parseImportFilename('Series Name Vol2 Ch3.pdf');
    expect(r.suggestedSeries).toBe('Series Name');
    expect(r.chapterNo).toBe(3);
  });

  it('strips scanlator tags', () => {
    const r = parseImportFilename('[GroupX] Series Name - 12 (HQ).pdf');
    expect(r.suggestedSeries).toBe('Series Name');
    expect(r.chapterNo).toBe(12);
  });

  it('handles bare-number filenames', () => {
    const r = parseImportFilename('045.pdf');
    expect(r.chapterNo).toBe(45);
  });

  it('defaults to ch 1 when no number is present', () => {
    const r = parseImportFilename('Subtitle Only.pdf');
    expect(r.chapterNo).toBe(1);
    expect(r.suggestedSeries).toBe('Subtitle Only');
  });

  it('falls back to Untitled for empty stems', () => {
    const r = parseImportFilename('.pdf');
    expect(r.suggestedSeries).toBe('Untitled');
  });

  it('handles "ตอนที่ N" (Thai chapter marker)', () => {
    const r = parseImportFilename('เรื่องของผม ตอนที่ 7.pdf');
    expect(r.chapterNo).toBe(7);
  });

  it('handles episode synonym', () => {
    const r = parseImportFilename('Show Title Ep 12.pdf');
    expect(r.chapterNo).toBe(12);
  });
});

describe('groupByseries', () => {
  it('groups same-series files case-insensitively', () => {
    const inputs = ['one piece - 1.pdf', 'One Piece - 2.pdf', 'naruto - 1.pdf'].map((name) => ({
      name,
      parsed: parseImportFilename(name),
    }));
    const groups = groupByseries(inputs);
    expect(groups.length).toBe(2);
    expect(groups[0].length).toBe(1); // Naruto first alphabetically
    expect(groups[1].length).toBe(2);
  });
});
