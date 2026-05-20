import { describe, it, expect } from 'vitest';
import { pageSlide } from '../../../src/shared/lib/transitions';
import { app } from '../../../src/shared/lib/store.svelte';

function fakeNode(): Element {
  return document.createElement('div');
}

describe('pageSlide', () => {
  it('outgoing mode returns a zero-duration fade', () => {
    const r = pageSlide(fakeNode(), { mode: 'out' });
    expect(r.duration).toBe(0);
    expect(r.css!(0, 1)).toContain('opacity: 0');
  });

  it('incoming mode produces forward slide when navDir=forward', () => {
    app.navDir = 'forward';
    const r = pageSlide(fakeNode(), { mode: 'in' });
    const css = r.css!(0, 1);
    expect(css).toContain('translate3d(40px');
    expect(css).toContain('opacity: 0');
  });

  it('incoming mode produces backward slide when navDir=back', () => {
    app.navDir = 'back';
    const r = pageSlide(fakeNode(), { mode: 'in' });
    expect(r.css!(0, 1)).toContain('translate3d(-40px');
  });

  it('css(1, 0) yields settled state (zero offset, full opacity)', () => {
    app.navDir = 'forward';
    const r = pageSlide(fakeNode(), { mode: 'in' });
    const css = r.css!(1, 0);
    expect(css).toContain('translate3d(0px');
    expect(css).toContain('opacity: 1');
  });

  it('defaults mode to "in" when opts omitted', () => {
    const r = pageSlide(fakeNode());
    expect(r.duration).toBeGreaterThan(0);
  });
});
