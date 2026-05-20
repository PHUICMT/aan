import { test, expect } from '../fixtures/app';
import { SidebarPage } from '../pages/SidebarPage';

test('? opens shortcuts dialog, Escape closes it', async ({ app }) => {
  const side = new SidebarPage(app);
  await side.go('home');

  const dialog = app.locator('[data-test="shortcuts-dialog"]');
  // Dispatch the literal character — Playwright's Shift+/ chord doesn't
  // always set e.key='?' under WebView2.
  await app.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
  });
  await expect(dialog).toBeVisible();

  await app.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
