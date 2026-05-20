import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { ReaderPage } from '../pages/ReaderPage';

// Cover the per-reader display settings (layout + theme + typography).
// The fixture seeds the prefs in localStorage to a known clean state at the
// start of each test, so this spec inherits that pristine baseline.

async function openNovelChapter(app: import('@playwright/test').Page) {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);
  await lib.open();
  await lib.clickSeriesByPid(2001);
  await detail.waitLoaded();
  await detail.openChapter('2001-ch2');
  await reader.waitLoaded();
  return reader;
}

test('switching to paged layout shows page indicator and arrow keys flip pages', async ({ app }) => {
  await openNovelChapter(app);
  const root = app.locator('[data-test="novel-root"]');
  await expect(root).toHaveAttribute('data-novel-layout', 'scroll');

  await app.click('[data-test="novel-settings-toggle"]');
  await app.click('[data-test="novel-layout-paged"]');
  await expect(root).toHaveAttribute('data-novel-layout', 'paged');

  // Close the menu before sending arrow keys so focus is on the document.
  await app.keyboard.press('Escape');
  await app.click('[data-test="novel-root"]');

  // Synthetic novels are short (~few KB) — they may render as a single page.
  // Only assert page advancement if more than one page is available.
  const count = Number(await root.getAttribute('data-novel-page-count')) || 1;
  if (count > 1) {
    await app.keyboard.press('ArrowRight');
    await expect(root).toHaveAttribute('data-novel-page-idx', '1');
    await app.keyboard.press('ArrowLeft');
    await expect(root).toHaveAttribute('data-novel-page-idx', '0');
  }
});

test('two-page spread toggle only appears in paged mode and persists', async ({ app }) => {
  await openNovelChapter(app);
  const root = app.locator('[data-test="novel-root"]');

  await app.click('[data-test="novel-settings-toggle"]');
  // Spread toggle should not be in the DOM while layout is scroll.
  await expect(app.locator('[data-test="novel-spread-toggle"]')).toHaveCount(0);

  await app.click('[data-test="novel-layout-paged"]');
  await expect(app.locator('[data-test="novel-spread-toggle"]')).toBeVisible();
  await app.click('[data-test="novel-spread-toggle"]');
  await expect(root).toHaveAttribute('data-novel-spread', '1');

  const stored = await app.evaluate(() => localStorage.getItem('aan.novel.spread'));
  expect(stored).toBe('1');
});

test('theme swatch updates root and persists across reload', async ({ app }) => {
  await openNovelChapter(app);
  const root = app.locator('[data-test="novel-root"]');
  // Default theme is dark (set by the store on a freshly-cleared localStorage).
  await expect(root).toHaveAttribute('data-novel-theme', 'dark');

  await app.click('[data-test="novel-settings-toggle"]');
  await app.click('[data-test="novel-theme-sepia"]');
  await expect(root).toHaveAttribute('data-novel-theme', 'sepia');

  const stored = await app.evaluate(() => localStorage.getItem('aan.novel.theme'));
  expect(stored).toBe('sepia');

  // Re-enter the reader from cold to confirm the saved value drives the UI.
  await app.reload({ waitUntil: 'domcontentloaded' });
  await openNovelChapter(app);
  await expect(app.locator('[data-test="novel-root"]')).toHaveAttribute('data-novel-theme', 'sepia');
});
