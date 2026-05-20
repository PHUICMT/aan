import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';

// Drives the SeriesEditModal end-to-end and asserts that mutations are
// visible in the hero. Each test owns its mutation: it edits a known
// fixture series and restores the original value before leaving.

const FIXTURE_PID = 1001;
const FIXTURE_NAME = 'Test Manga Alpha';

test.afterEach(async ({ app }) => {
  // Always restore the canonical name; tests that didn't touch it are a no-op.
  try {
    await invokeCmd(app, 'update_series', {
      pid: FIXTURE_PID,
      patch: { name: FIXTURE_NAME },
    });
  } catch { /* the spec may have already restored it */ }
});

test('rename a series and see the hero update', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  await lib.open();
  await lib.clickSeriesByPid(FIXTURE_PID);
  await expect(detail.root()).toBeVisible();

  await app.click('[data-test="series-edit"]');
  const nameInput = app.locator('[data-test="series-edit-name"]');
  await expect(nameInput).toBeVisible();

  await nameInput.fill(`${FIXTURE_NAME} (edited)`);
  await app.click('[data-test="series-edit-save"]');

  // Modal closes and hero shows the new name.
  await expect(app.locator('[data-test="series-edit-name"]')).toBeHidden();
  await expect(app.locator('h1').filter({ hasText: `${FIXTURE_NAME} (edited)` })).toBeVisible();
});

test('blank name shows an error and does not save', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  await lib.open();
  await lib.clickSeriesByPid(FIXTURE_PID);
  await expect(detail.root()).toBeVisible();

  await app.click('[data-test="series-edit"]');
  const nameInput = app.locator('[data-test="series-edit-name"]');
  await nameInput.fill('   ');
  await app.click('[data-test="series-edit-save"]');

  // Form should still be visible (validation kept it open).
  await expect(nameInput).toBeVisible();
  await app.keyboard.press('Escape');
  // Original name still in the hero.
  await expect(app.locator('h1').filter({ hasText: FIXTURE_NAME })).toBeVisible();
});

test('inline chapter title edit persists', async ({ app }) => {
  // Use an imported throwaway chapter so we never touch fixture chapters.
  const out = await invokeCmd<{ pid: number; chapter_id: string }>(app, 'import_pdf', {
    args: {
      src_path: (await sampleAbsPath()).pdf,
      series_name: 'E2E Edit Sandbox',
      kind: 'manga',
      chapter_no: 1,
      chapter_title: 'Pre-edit',
      page_count: 1,
      cover_bytes: null,
    },
  });

  try {
    const lib = new LibraryPage(app);
    await lib.open();
    await app.click('[data-test="nav-library"]');
    await lib.card(out.pid).click();

    const row = app.locator(`[data-test="chapter-row-${out.chapter_id}"]`);
    await expect(row).toBeVisible();
    await row.locator(`[data-test="chapter-edit-${out.chapter_id}"]`).click();

    const titleInput = row.locator('input[type="text"], input:not([type])').first();
    await titleInput.fill('Edited title');
    await app.keyboard.press('Enter');

    await expect(row.locator('.title-text')).toHaveText('Edited title');
  } finally {
    await invokeCmd(app, 'delete_series_force', { pid: out.pid });
  }
});

async function sampleAbsPath() {
  const path = await import('node:path');
  const url = await import('node:url');
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  return {
    pdf: path.resolve(here, '../../fixtures/build/import-samples/sample.pdf'),
  };
}
