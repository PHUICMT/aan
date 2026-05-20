import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class SeriesDetailPage {
  constructor(private page: Page) {}

  root(): Locator { return this.page.locator('[data-test="series-detail"]'); }

  async waitLoaded() {
    await expect(this.root()).toBeVisible();
    // Chapter list lives inside detail; wait for at least one chapter row to render.
    await this.page.locator('[data-test^="chapter-row-"]').first().waitFor();
  }

  chapterRow(chapterId: string): Locator {
    return this.page.locator(`[data-test="chapter-row-${chapterId}"]`);
  }

  chapterRows(): Locator {
    return this.page.locator('[data-test^="chapter-row-"]');
  }

  async openChapter(chapterId: string) {
    await this.page.click(`[data-test="chapter-read-${chapterId}"]`);
  }

  async toggleFavorite() {
    await this.page.click('[data-test="series-fav"]');
  }

  async favoriteIsOn(): Promise<boolean> {
    const cls = await this.page.locator('[data-test="series-fav"]').getAttribute('class');
    return !!cls && cls.includes('on');
  }

  async clickContinue() {
    await this.page.click('[data-test="series-continue"]');
  }

  async openStatusMenu() {
    await this.page.click('[data-test="series-status"]');
  }

  async back() {
    await this.page.click('[data-test="back"]');
  }
}
