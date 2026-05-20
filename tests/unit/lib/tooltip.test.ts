import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

type TooltipModule = typeof import('../../../src/shared/lib/tooltip');
let tooltip: TooltipModule['tooltip'];

beforeEach(async () => {
  document.body.innerHTML = '';
  vi.resetModules();
  ({ tooltip } = await import('../../../src/shared/lib/tooltip'));
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('tooltip action', () => {
  it('mounts host on first hover', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    tooltip(btn, 'hello');
    btn.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(400);
    expect(document.querySelector('.nv-tooltip')).not.toBeNull();
  });

  it('shows configured text', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    tooltip(btn, { text: 'tip body', placement: 'bottom', delay: 0 });
    btn.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(1);
    const host = document.querySelector('.nv-tooltip');
    expect(host?.textContent).toBe('tip body');
  });

  it('hides on mouseleave', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    tooltip(btn, { text: 'x', delay: 0 });
    btn.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(1);
    btn.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(100);
    const host = document.querySelector('.nv-tooltip') as HTMLElement;
    expect(host.style.opacity).toBe('0');
  });

  it('destroy() removes listeners', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    const removeSpy = vi.spyOn(btn, 'removeEventListener');
    const h = tooltip(btn, 'q');
    h.destroy();
    expect(removeSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
  });

  it('update() swaps options', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    const h = tooltip(btn, 'first');
    h.update?.({ text: 'second', delay: 0 });
    btn.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(1);
    const host = document.querySelector('.nv-tooltip');
    expect(host?.textContent).toBe('second');
  });

  it('skips when text is empty', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    tooltip(btn, '');
    btn.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(400);
    const host = document.querySelector('.nv-tooltip') as HTMLElement | null;
    if (host) expect(host.style.opacity).toBe('0');
  });
});
