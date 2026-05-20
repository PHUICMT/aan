import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import ResetSection from '../../../src/features/settings/sections/ResetSection.svelte';

// Stash + restore window.location so location.reload doesn't blow up jsdom.
const originalLocation = window.location;
let reloadSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reloadSpy = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload: reloadSpy },
  });
  localStorage.setItem('aan.lang', 'en');
  localStorage.setItem('other.key', 'keep');
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('ResetSection', () => {
  it('initially shows the warn CTA, not the confirm action', () => {
    const { container } = render(ResetSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    expect(container.querySelector('button.action.warn')).not.toBeNull();
    expect(container.querySelector('button.action.danger')).toBeNull();
  });

  it('clicking the CTA reveals the confirm action', async () => {
    const { container } = render(ResetSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    await fireEvent.click(container.querySelector('button.action.warn') as HTMLButtonElement);
    flushSync();
    expect(container.querySelector('button.action.danger')).not.toBeNull();
  });

  it('cancel returns to the warn state', async () => {
    const { container } = render(ResetSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    await fireEvent.click(container.querySelector('button.action.warn') as HTMLButtonElement);
    flushSync();
    await fireEvent.click(container.querySelector('button.confirm-no') as HTMLButtonElement);
    flushSync();
    expect(container.querySelector('button.action.warn')).not.toBeNull();
    expect(container.querySelector('button.action.danger')).toBeNull();
  });

  it('confirm clears aan.* keys, leaves others, and reloads', async () => {
    const { container } = render(ResetSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    await fireEvent.click(container.querySelector('button.action.warn') as HTMLButtonElement);
    flushSync();
    await fireEvent.click(container.querySelector('button.action.danger') as HTMLButtonElement);
    expect(localStorage.getItem('aan.lang')).toBeNull();
    expect(localStorage.getItem('other.key')).toBe('keep');
    expect(reloadSpy).toHaveBeenCalledOnce();
  });
});
