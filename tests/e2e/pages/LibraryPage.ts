import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class LibraryPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.click('[data-test="nav-library"]');
    await expect(this.page.locator('[data-test="library"]')).toBeVisible();
  }

  async searchFor(query: string) {
    await this.page.fill('[data-test="library-search"]', query);
  }

  async setType(id: 'all' | 'manga' | 'comic' | 'novel' | 'original_novel') {
    await this.page.click(`[data-test="filter-type-${id}"]`);
  }

  async openFiltersPanel() {
    const panel = this.page.locator('[data-test="filter-status-all"]');
    if (await panel.count() === 0 || !(await panel.first().isVisible())) {
      await this.page.click('.filters-toggle');
    }
  }

  async setStatus(id: string) {
    await this.openFiltersPanel();
    await this.page.click(`[data-test="filter-status-${id}"]`);
  }

  async setDl(id: string) {
    await this.openFiltersPanel();
    await this.page.click(`[data-test="filter-dl-${id}"]`);
  }

  async setRs(id: string) {
    await this.openFiltersPanel();
    await this.page.click(`[data-test="filter-rs-${id}"]`);
  }

  async setView(mode: 'grid' | 'compact' | 'list') {
    await this.page.click(`[data-test="view-${mode}"]`);
  }

  cards(): Locator {
    return this.page.locator('[data-test="cover-card"]');
  }

  card(pid: number): Locator {
    return this.page.locator(`[data-test="cover-card"][data-pid="${pid}"]`);
  }

  async clickSeriesByPid(pid: number) {
    await this.card(pid).click();
  }

  async expectSeriesCount(n: number) {
    await expect(this.cards()).toHaveCount(n);
  }
}
