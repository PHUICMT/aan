import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  prefetchChapter,
  prefetchChapterBytes,
  hasPrefetched,
  takeChapterBytes,
} from '../../../src/shared/lib/prefetch';

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue([1, 2, 3]);
});

describe('prefetchChapter', () => {
  it('skips when chapterId is missing', () => {
    prefetchChapter(null, '/x.pdf');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('skips when pdfPath is missing', () => {
    prefetchChapter('c1', null);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('skips non-cacheable extensions (image dirs)', () => {
    prefetchChapter('c2', '/some/dir');
    expect(hasPrefetched('c2')).toBe(false);
  });

  it('caches pdf reads and marks them prefetched', () => {
    prefetchChapter('c3', '/a.pdf');
    expect(hasPrefetched('c3')).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('read_chapter_bytes', { pdfPath: '/a.pdf' });
  });

  it('caches html/htm/txt', () => {
    prefetchChapter('h1', '/a.html');
    prefetchChapter('h2', '/a.htm');
    prefetchChapter('h3', '/a.txt');
    expect(hasPrefetched('h1')).toBe(true);
    expect(hasPrefetched('h2')).toBe(true);
    expect(hasPrefetched('h3')).toBe(true);
  });

  it('is idempotent for the same chapter', () => {
    prefetchChapter('c4', '/a.pdf');
    prefetchChapter('c4', '/a.pdf');
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('evicts oldest beyond capacity (3)', () => {
    prefetchChapter('a', '/a.pdf');
    prefetchChapter('b', '/b.pdf');
    prefetchChapter('c', '/c.pdf');
    prefetchChapter('d', '/d.pdf');
    expect(hasPrefetched('a')).toBe(false);
    expect(hasPrefetched('d')).toBe(true);
  });

  it('prefetchChapterBytes is an alias', () => {
    prefetchChapterBytes('alias1', '/a.pdf');
    expect(hasPrefetched('alias1')).toBe(true);
  });
});

describe('takeChapterBytes', () => {
  it('consumes cached entry', async () => {
    prefetchChapter('t1', '/a.pdf');
    expect(hasPrefetched('t1')).toBe(true);
    const bytes = await takeChapterBytes('t1', '/a.pdf');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(hasPrefetched('t1')).toBe(false);
  });

  it('falls back to a fresh read when not cached', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValueOnce([4, 5]);
    const bytes = await takeChapterBytes('missing', '/x.pdf');
    expect(Array.from(bytes)).toEqual([4, 5]);
    expect(mockInvoke).toHaveBeenCalledWith('read_chapter_bytes', { pdfPath: '/x.pdf' });
  });

  it('falls back when chapterId is null', async () => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValueOnce([7]);
    const bytes = await takeChapterBytes(null, '/y.pdf');
    expect(Array.from(bytes)).toEqual([7]);
  });
});

describe('hasPrefetched', () => {
  it('returns false for null/undefined ids', () => {
    expect(hasPrefetched(null)).toBe(false);
    expect(hasPrefetched(undefined)).toBe(false);
  });
});
