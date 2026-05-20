import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';

test('boots and shows home + sidebar', async ({ app }) => {
  await expect(app.locator('[data-test="nav-home"]')).toBeVisible();
  await expect(app.locator('[data-test="sidebar"]')).toBeVisible();
});

test('library renders the fixture catalog of 6 series', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.open();
  await lib.expectSeriesCount(6);
});
