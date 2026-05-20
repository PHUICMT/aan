import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class ReaderPage {
  constructor(private page: Page) {}

  root(): Locator { return this.page.locator('[data-test="reader"]'); }
  toolbar(): Locator { return this.page.locator('[data-test="reader-toolbar"]'); }
  jumpInput(): Locator { return this.page.locator('[data-test="reader-jump-input"]'); }

  async waitLoaded() {
    await expect(this.root()).toBeVisible();
  }

  async next() {
    await this.page.click('[data-test="reader-next"]');
  }

  async prev() {
    await this.page.click('[data-test="reader-prev"]');
  }

  async jumpTo(n: number) {
    const input = this.jumpInput();
    await input.fill(String(n));
    await input.press('Enter');
  }

  async back() {
    await this.page.click('[data-test="back"]');
  }
}
