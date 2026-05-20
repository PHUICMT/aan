import { test as base, chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

// Fixture that attaches Playwright to the already-running Tauri app via
// CDP. The app itself is spawned in global-setup.ts so it survives across
// spec files in a single run.

declare global {
  // eslint-disable-next-line no-var
  var __CDP_PORT__: number | undefined;
}

let browser: Browser | undefined;

export const test = base.extend<{ app: Page }>({
  app: async ({}, use) => {
    const port = Number(process.env.AAN_CDP_PORT ?? globalThis.__CDP_PORT__ ?? 0);
    if (!port) throw new Error('CDP port not set — global-setup did not run');
    if (!browser) {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    }
    const ctx = browser.contexts()[0];
    // Tauri spawns a second webview for the tray popup (`?win=tray_menu`).
    // Pick the main window — the one without that marker.
    const pages = ctx.pages();
    const page = pages.find((p) => !p.url().includes('win=tray_menu')) ?? pages[0];
    await page.waitForLoadState('domcontentloaded');
    // Reset persisted UI state between specs so filters, last-reader, theme,
    // and sidebar don't bleed across cases. Reload picks up the cleared keys.
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('aan.')) localStorage.removeItem(k);
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await use(page);
  },
});

export { expect } from '@playwright/test';
