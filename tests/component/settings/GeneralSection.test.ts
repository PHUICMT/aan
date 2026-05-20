import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import GeneralSection from '../../../src/features/settings/sections/GeneralSection.svelte';
import { app } from '../../../src/shared/lib/store.svelte';
import { AVAILABLE_LANGS } from '../../../src/shared/lib/i18n.svelte';

describe('GeneralSection', () => {
  it('renders one pill per available language', () => {
    const { container } = render(GeneralSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    expect(container.querySelectorAll('button.lang').length).toBe(AVAILABLE_LANGS.length);
  });

  it('clicking a language pill switches app.lang', async () => {
    app.lang = 'en';
    const { container } = render(GeneralSection, {
      props: { open: true, searching: false, query: '', onToggle: () => {} },
    });
    const buttons = Array.from(container.querySelectorAll('button.lang')) as HTMLButtonElement[];
    const thBtn = buttons.find((b) => b.textContent?.includes('ไทย'))!;
    await fireEvent.click(thBtn);
    flushSync();
    expect(app.lang).toBe('th');
    expect(localStorage.getItem('aan.lang')).toBe('th');
  });
});
