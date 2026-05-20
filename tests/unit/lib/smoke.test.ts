import { describe, it, expect } from 'vitest';

describe('test runner', () => {
  it('vitest is wired up', () => {
    expect(1 + 1).toBe(2);
  });

  it('jsdom provides localStorage', () => {
    localStorage.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
  });
});
