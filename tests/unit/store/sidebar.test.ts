import { describe, it, expect, beforeEach } from 'vitest';
import { toggleSidebar } from '../../../src/shared/lib/store/sidebar.svelte';
import { app } from '../../../src/shared/lib/store/state.svelte';

beforeEach(() => {
  app.sidebarCollapsed = false;
});

describe('toggleSidebar', () => {
  it('flips and persists collapsed', () => {
    toggleSidebar();
    expect(app.sidebarCollapsed).toBe(true);
    expect(localStorage.getItem('aan.sidebar')).toBe('collapsed');
  });

  it('flips back to expanded', () => {
    toggleSidebar();
    toggleSidebar();
    expect(app.sidebarCollapsed).toBe(false);
    expect(localStorage.getItem('aan.sidebar')).toBe('expanded');
  });
});
