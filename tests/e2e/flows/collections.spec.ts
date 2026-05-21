import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';

// Smart collections persist as rows in the `collections` table. The
// chip row is rendered inside Library. Each test cleans up every row
// it created, plus any leftover, so re-runs see an empty list.

const createdIds: number[] = [];

test.afterEach(async ({ app }) => {
  const existing = await invokeCmd<Array<{ id: number }>>(app, 'list_collections');
  for (const c of existing) {
    try { await invokeCmd(app, 'delete_collection', { id: c.id }); } catch {}
  }
  createdIds.length = 0;
});

test('save current filters as a collection, chip appears and persists', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.open();
  // Narrow to manga + reading status, then save.
  await lib.setType('manga');
  await lib.setStatus('all'); // ensures the filters panel is open
  await lib.setRs('reading');

  await app.click('[data-test="collection-save"]');
  await app.fill('[data-test="collection-save-input"]', 'Manga · reading');
  await app.click('[data-test="collection-save-confirm"]');

  // Chip renders.
  const chip = app.locator('[data-test="collection-chip"]').filter({ hasText: 'Manga · reading' });
  await expect(chip).toBeVisible();

  // Backend row exists.
  const list = await invokeCmd<Array<{ name: string; filter_json: string }>>(app, 'list_collections');
  expect(list).toHaveLength(1);
  expect(list[0].name).toBe('Manga · reading');
  expect(list[0].filter_json).toContain('"type":"manga"');
  expect(list[0].filter_json).toContain('"rs":"reading"');
});

test('clicking a chip re-applies the saved filter snapshot', async ({ app }) => {
  // Seed a collection directly so we don't depend on the save flow above.
  const id = await invokeCmd<number>(app, 'create_collection', {
    name: 'Novels only',
    filterJson: JSON.stringify({ type: 'novel', status: 'all', dl: 'all', rs: 'all', sort: 'updated' }),
  });
  createdIds.push(id);

  const lib = new LibraryPage(app);
  await lib.open();
  // Different starting state.
  await lib.setType('manga');
  // Click the chip.
  await app.click(`[data-test="collection-chip"][data-collection-id="${id}"]`);
  // Type filter should now be novel.
  await expect(app.locator('[data-test="filter-type-novel"]')).toHaveClass(/active/);
});

test('deleting a chip drops it from the row and the backend', async ({ app }) => {
  const id = await invokeCmd<number>(app, 'create_collection', {
    name: 'Doomed',
    filterJson: JSON.stringify({ type: 'all' }),
  });
  createdIds.push(id);

  const lib = new LibraryPage(app);
  await lib.open();
  const chip = app.locator(`[data-test="collection-chip"][data-collection-id="${id}"]`);
  await expect(chip).toBeVisible();
  await chip.locator('[data-test="collection-chip-delete"]').click();
  await expect(chip).toHaveCount(0);
  const list = await invokeCmd<unknown[]>(app, 'list_collections');
  expect(list).toEqual([]);
});
