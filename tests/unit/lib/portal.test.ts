import { describe, it, expect } from 'vitest';
import { portal, anchorBelow } from '../../../src/shared/lib/portal';

describe('portal action', () => {
  it('moves node to document.body', () => {
    const host = document.createElement('section');
    document.body.appendChild(host);
    const node = document.createElement('div');
    host.appendChild(node);
    portal(node);
    expect(node.parentElement).toBe(document.body);
  });

  it('destroy() removes the node', () => {
    const node = document.createElement('div');
    const handle = portal(node);
    expect(document.body.contains(node)).toBe(true);
    handle.destroy();
    expect(document.body.contains(node)).toBe(false);
  });
});

describe('anchorBelow', () => {
  it('returns top/left/right with default gap', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.getBoundingClientRect = () => ({
      top: 10, bottom: 30, left: 100, right: 200, width: 100, height: 20, x: 100, y: 10, toJSON: () => ({}),
    }) as DOMRect;
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    const a = anchorBelow(btn);
    expect(a.top).toBe(38); // bottom + 8
    expect(a.left).toBe(100);
    expect(a.right).toBe(800);
  });

  it('honours custom gap', () => {
    const btn = document.createElement('button');
    btn.getBoundingClientRect = () => ({
      top: 0, bottom: 20, left: 0, right: 10, width: 10, height: 20, x: 0, y: 0, toJSON: () => ({}),
    }) as DOMRect;
    const a = anchorBelow(btn, { gap: 4 });
    expect(a.top).toBe(24);
  });
});
