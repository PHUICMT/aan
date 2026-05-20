import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { getCoverUrl, invalidateCover } from '../../../src/shared/lib/covers';

const mockInvoke = vi.mocked(invoke);

let urlCounter = 0;
const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
  urlCounter = 0;
  created.length = 0;
  revoked.length = 0;
  globalThis.URL.createObjectURL = vi.fn(() => {
    const u = `blob:mock-${++urlCounter}`;
    created.push(u);
    return u;
  });
  globalThis.URL.revokeObjectURL = vi.fn((u: string) => { revoked.push(u); });
  mockInvoke.mockReset();
});

describe('getCoverUrl', () => {
  it('returns a blob URL on first read', async () => {
    mockInvoke.mockResolvedValueOnce([1, 2, 3]);
    const url = await getCoverUrl(1);
    expect(url).toBe('blob:mock-1');
    expect(mockInvoke).toHaveBeenCalledWith('read_cover', { pid: 1 });
  });

  it('caches subsequent reads', async () => {
    mockInvoke.mockResolvedValueOnce([1]);
    const a = await getCoverUrl(2);
    const b = await getCoverUrl(2);
    expect(a).toBe(b);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent in-flight requests', async () => {
    mockInvoke.mockResolvedValueOnce([9]);
    const [a, b] = await Promise.all([getCoverUrl(3), getCoverUrl(3)]);
    expect(a).toBe(b);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('returns null when bytes are empty', async () => {
    mockInvoke.mockResolvedValueOnce(null);
    const url = await getCoverUrl(4);
    expect(url).toBeNull();
  });
});

describe('invalidateCover', () => {
  it('drops the cached entry and revokes its url', async () => {
    mockInvoke.mockResolvedValueOnce([1]);
    const first = await getCoverUrl(5);
    invalidateCover(5);
    expect(revoked).toContain(first);
    mockInvoke.mockResolvedValueOnce([2]);
    const second = await getCoverUrl(5);
    expect(second).not.toBe(first);
  });

  it('is a no-op for unknown pid', () => {
    expect(() => invalidateCover(99999)).not.toThrow();
  });
});
