import type { Page, Locator } from '@playwright/test';

type NavId = 'home' | 'library' | 'favorites' | 'history' | 'settings';

export class SidebarPage {
  constructor(private page: Page) {}

  root(): Locator { return this.page.locator('[data-test="sidebar"]'); }

  async go(id: NavId) {
    await this.page.click(`[data-test="nav-${id}"]`);
  }

  async toggleCollapse() {
    await this.page.click('[data-test="sidebar-collapse"]');
  }

  async isCollapsed(): Promise<boolean> {
    const cls = await this.root().getAttribute('class');
    return !!cls && cls.includes('collapsed');
  }
}
