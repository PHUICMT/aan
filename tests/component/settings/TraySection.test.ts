import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import TraySection from '../../../src/features/settings/sections/TraySection.svelte';
import { app } from '../../../src/shared/lib/store.svelte';

describe('TraySection', () => {
  it('toggle reflects current app.closeToTray', () => {
    app.closeToTray = true;
    const { container } = render(TraySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    expect(container.querySelector('button.toggle.on')).not.toBeNull();
  });

  it('clicking the toggle flips app.closeToTray and persists', async () => {
    app.closeToTray = false;
    const { container } = render(TraySection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    const toggle = container.querySelector('button.toggle') as HTMLButtonElement;
    await fireEvent.click(toggle);
    flushSync();
    expect(app.closeToTray).toBe(true);
    expect(localStorage.getItem('aan.close_to_tray')).toBe('1');
  });
});
