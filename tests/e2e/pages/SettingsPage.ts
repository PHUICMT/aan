import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

type SectionId = 'general' | 'appearance' | 'typography' | 'datafolder' | 'tray' | 'reset';
type ThemeId = 'dark' | 'light' | 'sepia' | 'oled' | 'dim';

export class SettingsPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.click('[data-test="nav-settings"]');
    await expect(this.section('general')).toBeVisible();
  }

  section(id: SectionId): Locator {
    return this.page.locator(`[data-test="settings-section-${id}"]`);
  }

  async expandSection(id: SectionId) {
    const sec = this.section(id);
    const isOpen = (await sec.getAttribute('class') ?? '').includes('open');
    if (!isOpen) await sec.locator('.group-head').click();
  }

  async pickTheme(theme: ThemeId) {
    await this.expandSection('appearance');
    await this.page.click(`[data-test="theme-${theme}"]`);
  }

  async themeIsActive(theme: ThemeId): Promise<boolean> {
    const cls = await this.page.locator(`[data-test="theme-${theme}"]`).getAttribute('class');
    return !!cls && cls.includes('active');
  }
}
