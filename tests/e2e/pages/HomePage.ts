import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  async open() {
    await this.page.click('[data-test="nav-home"]');
  }

  async pickRandom() {
    await this.page.click('[data-test="home-pick-random"]');
    await expect(this.modal()).toBeVisible();
  }

  modal(): Locator { return this.page.locator('[data-test="random-modal"]'); }
  pickedName(): Locator {
    // Reroll triggers a cross-fade — the outgoing card lingers briefly so
    // two `.random-name` nodes coexist. The freshly mounted one is last.
    return this.modal().locator('[data-test="random-name"]').last();
  }

  async reroll() {
    await this.page.click('[data-test="random-reroll"]');
  }

  async readPicked() {
    await this.page.click('[data-test="random-read"]');
  }

  async cancelPick() {
    await this.page.click('[data-test="random-cancel"]');
  }
}
