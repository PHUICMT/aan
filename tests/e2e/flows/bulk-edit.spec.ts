import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';

// Bulk metadata editor: select 2 manga cards, apply an author + a tag
// add, assert the backend row picked them up. Cleanup undoes the
// changes so the fixture stays pristine.

const TARGET_PIDS = [1001, 1002];

test.afterEach(async ({ app }) => {
  // Roll back ONLY what this spec touches (author + the test tag).
  // Reading-status MUST be preserved — wiping it removes engagement
  // from series 1002 (empty + RS='plan'), which then fails the
  // list_local_series engagement filter and breaks downstream specs.
  try {
    await invokeCmd(app, 'bulk_update_series', {
      pids: TARGET_PIDS,
      patch: {
        author_name: '',
        remove_tags: ['e2e-tag'],
        artist_name: null, status: null, reading_status: null,
        clear_reading_status: null, add_tags: null,
      },
    });
  } catch {}
});

test('select two cards + bulk edit author + add tag', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.open();

  // Enter select mode.
  await app.click('[data-test="library-select-toggle"]');
  // Click each card to toggle selection.
  for (const pid of TARGET_PIDS) {
    await app.click(`[data-test="cover-card"][data-pid="${pid}"]`);
  }
  await expect(app.locator('[data-test="bulk-count"]')).toHaveText('2');

  await app.click('[data-test="bulk-edit-open"]');
  const modal = app.locator('[data-test="bulk-edit-modal"]');
  await expect(modal).toBeVisible();

  await app.fill('[data-test="bulk-author"]', 'E2E Author');
  await app.fill('[data-test="bulk-add-tags"]', 'e2e-tag');
  await app.click('[data-test="bulk-apply"]');

  // The Library page refreshes (modal closes + select mode exits).
  await expect(modal).toHaveCount(0);

  // Backend confirmation.
  for (const pid of TARGET_PIDS) {
    const row = await invokeCmd<{ author_name: string | null }>(app, 'get_series', { pid });
    expect(row.author_name).toBe('E2E Author');
  }
});
