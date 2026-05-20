import { describe, it, expect, beforeEach } from 'vitest';
import { setCloseToTrayLocal } from '../../../src/shared/lib/store/tray.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  app.closeToTray = false;
});

describe('setCloseToTrayLocal', () => {
  it('on=true persists "1"', () => {
    setCloseToTrayLocal(true);
    expect(app.closeToTray).toBe(true);
    expect(localStorage.getItem('aan.close_to_tray')).toBe('1');
  });

  it('on=false persists "0"', () => {
    setCloseToTrayLocal(false);
    expect(localStorage.getItem('aan.close_to_tray')).toBe('0');
  });
});
