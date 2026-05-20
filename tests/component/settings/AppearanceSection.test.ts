import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import AppearanceSection from '../../../src/features/settings/sections/AppearanceSection.svelte';
import { app } from '../../../src/shared/lib/store.svelte';

describe('AppearanceSection', () => {
  it('renders 5 theme buttons when open', () => {
    const { container } = render(AppearanceSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    expect(container.querySelectorAll('button.theme-btn').length).toBe(5);
  });

  it('does not render body when collapsed', () => {
    const { container } = render(AppearanceSection, {
      props: { open: false, searching: false, query: '', onToggle: () => {} },
    });
    expect(container.querySelector('.group-body')).toBeNull();
  });

  it('clicking a theme button switches app.theme and marks it active', async () => {
    app.theme = 'dark';
    const { container } = render(AppearanceSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    // Find the "light" theme button by its swatch hex (only light = #f8f7f2).
    const buttons = Array.from(container.querySelectorAll('button.theme-btn')) as HTMLButtonElement[];
    const lightBtn = buttons.find((b) => b.style.getPropertyValue('--swatch').toLowerCase() === '#f8f7f2');
    expect(lightBtn).toBeDefined();
    await fireEvent.click(lightBtn!);
    flushSync();
    expect(app.theme).toBe('light');
    expect(localStorage.getItem('aan.theme')).toBe('light');
    // Re-query the same node — Svelte updates the active class in place.
    const refreshed = Array.from(container.querySelectorAll('button.theme-btn')) as HTMLButtonElement[];
    const stillLight = refreshed.find((b) => b.style.getPropertyValue('--swatch').toLowerCase() === '#f8f7f2')!;
    expect(stillLight.classList.contains('active')).toBe(true);
  });
});
