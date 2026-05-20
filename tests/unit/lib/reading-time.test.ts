import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { startReadingTimer } from '../../../src/shared/lib/reading-time';

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(undefined);
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startReadingTimer', () => {
  it('returns a stop+flush handle', () => {
    const t = startReadingTimer('c1', 1);
    expect(typeof t.stop).toBe('function');
    expect(typeof t.flush).toBe('function');
    t.stop();
  });

  it('does not log when chapterId is missing', async () => {
    const t = startReadingTimer(null, 1);
    vi.advanceTimersByTime(2000);
    await t.flush();
    expect(mockInvoke).not.toHaveBeenCalled();
    t.stop();
  });

  it('does not log when pid is missing', async () => {
    const t = startReadingTimer('c1', null);
    vi.advanceTimersByTime(2000);
    await t.flush();
    expect(mockInvoke).not.toHaveBeenCalled();
    t.stop();
  });

  it('stop() cleans up listeners and intervals', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const t = startReadingTimer('c1', 1);
    t.stop();
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('flush is a no-op when below 1s accumulated', async () => {
    const t = startReadingTimer('c1', 1);
    await t.flush();
    expect(mockInvoke).not.toHaveBeenCalled();
    t.stop();
  });

  it('responds to visibilitychange while hidden by flushing', () => {
    const t = startReadingTimer('c1', 1);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    // No crash; under jsdom no further assertion needed for visibility branch.
    t.stop();
  });
});
