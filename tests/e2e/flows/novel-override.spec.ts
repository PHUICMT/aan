import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { ReaderPage } from '../pages/ReaderPage';

// Per-series novel reader override: snapshots the current visible
// settings into series.reader_prefs_json so the next chapter open
// re-applies them. Cleanup wipes the column for the fixture series.

const TEST_PID = 2001;

test.afterEach(async ({ app }) => {
  try { await invokeCmd(app, 'clear_series_reader_prefs', { pid: TEST_PID }); } catch {}
});

async function openNovelChapter(app: import('@playwright/test').Page) {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);
  await lib.open();
  await lib.clickSeriesByPid(TEST_PID);
  await detail.waitLoaded();
  await detail.openChapter('2001-ch2');
  await reader.waitLoaded();
}

test('saving override stamps the row + reapplies on reopen', async ({ app }) => {
  await openNovelChapter(app);
  const root = app.locator('[data-test="novel-root"]');

  // Flip the theme to sepia + layout to paged, then save as override.
  await app.click('[data-test="novel-settings-toggle"]');
  await app.click('[data-test="novel-theme-sepia"]');
  await app.click('[data-test="novel-layout-paged"]');
  await app.click('[data-test="novel-override-save"]');

  const stored = await invokeCmd<string | null>(app, 'get_series_reader_prefs', { pid: TEST_PID });
  expect(stored).toBeTruthy();
  expect(stored!).toContain('"theme":"sepia"');
  expect(stored!).toContain('"layout":"paged"');

  // Re-enter the reader cold. The fixture clears aan.* before each test,
  // so this also verifies that the override (not localStorage) is what
  // drives the re-applied state.
  await app.reload({ waitUntil: 'domcontentloaded' });
  await openNovelChapter(app);
  await expect(app.locator('[data-test="novel-root"]')).toHaveAttribute('data-novel-theme', 'sepia');
  await expect(app.locator('[data-test="novel-root"]')).toHaveAttribute('data-novel-layout', 'paged');
});

test('clearing the override falls back to global defaults', async ({ app }) => {
  // Seed an override directly so this test doesn't depend on the prior one.
  await invokeCmd(app, 'set_series_reader_prefs', {
    pid: TEST_PID,
    json: JSON.stringify({ theme: 'black', layout: 'scroll', lineHeight: 1.9, maxWidth: 760, spread: false }),
  });

  await openNovelChapter(app);
  const root = app.locator('[data-test="novel-root"]');
  await expect(root).toHaveAttribute('data-novel-theme', 'black');

  await app.click('[data-test="novel-settings-toggle"]');
  await app.click('[data-test="novel-override-clear"]');
  // Global default is 'dark'; clearing should snap back to that.
  await expect(root).toHaveAttribute('data-novel-theme', 'dark');

  const stored = await invokeCmd<string | null>(app, 'get_series_reader_prefs', { pid: TEST_PID });
  expect(stored).toBeNull();
});
