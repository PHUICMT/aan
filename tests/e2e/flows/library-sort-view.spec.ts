import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';

// Sort keys mirror SORT_KEYS in useLibraryFilters.svelte.ts.
const SORT_KEYS = ['updated', 'name', 'progress', 'last_read'] as const;

test.beforeEach(async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.open();
});

test('sort menu opens on trigger click and closes with Escape', async ({ app }) => {
  const trigger = app.locator('[data-test="library-sort-trigger"]');
  const menu = app.locator('[data-test="library-sort-menu"]');

  await expect(menu).toHaveCount(0);
  await trigger.click();
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await app.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('sort by name puts Alpha first', async ({ app }) => {
  await app.locator('[data-test="library-sort-trigger"]').click();
  await app.locator('[data-test="sort-item-name"]').click();
  await expect(app.locator('[data-test="library-sort-menu"]')).toHaveCount(0);

  // Alphabetical: "Test Manga Alpha" (1001) comes first across the fixture set.
  await expect(app.locator('[data-test="cover-card"]').first()).toHaveAttribute('data-pid', '1001');
});

test('each sort key writes aan.lib.sort to localStorage', async ({ app }) => {
  for (const key of SORT_KEYS) {
    await app.locator('[data-test="library-sort-trigger"]').click();
    const item = app.locator(`[data-test="sort-item-${key}"]`);
    await expect(item).toBeVisible();
    await item.click();
    await expect(app.locator('[data-test="library-sort-menu"]')).toHaveCount(0);
    expect(await app.evaluate(() => localStorage.getItem('aan.lib.sort'))).toBe(key);
  }
});

test('active sort item shows the check marker', async ({ app }) => {
  await app.locator('[data-test="library-sort-trigger"]').click();
  await app.locator('[data-test="sort-item-name"]').click();

  await app.locator('[data-test="library-sort-trigger"]').click();
  await expect(app.locator('[data-test="sort-item-name"]')).toHaveClass(/active/);
  // Sibling options must not carry the active marker simultaneously.
  await expect(app.locator('[data-test="sort-item-updated"]')).not.toHaveClass(/active/);
});

test('sort selection persists across reload', async ({ app }) => {
  await app.locator('[data-test="library-sort-trigger"]').click();
  await app.locator('[data-test="sort-item-name"]').click();
  expect(await app.evaluate(() => localStorage.getItem('aan.lib.sort'))).toBe('name');

  await app.reload({ waitUntil: 'domcontentloaded' });
  const lib = new LibraryPage(app);
  await lib.open();

  expect(await app.evaluate(() => localStorage.getItem('aan.lib.sort'))).toBe('name');
  await expect(app.locator('[data-test="cover-card"]').first()).toHaveAttribute('data-pid', '1001');
});

test('default view mode is grid', async ({ app }) => {
  // No persisted view — composable defaults to 'grid'.
  expect(await app.evaluate(() => localStorage.getItem('aan.lib.view'))).toBeNull();
  await expect(app.locator('[data-test="view-grid"]')).toHaveClass(/active/);
  await expect(app.locator('.grid').first()).toBeVisible();
  await expect(app.locator('.list-view')).toHaveCount(0);
});

test('switching to compact applies .mode-compact on the grid', async ({ app }) => {
  await app.locator('[data-test="view-compact"]').click();
  await expect(app.locator('[data-test="view-compact"]')).toHaveClass(/active/);
  await expect(app.locator('.grid.mode-compact')).toBeVisible();
  await expect(app.locator('.list-view')).toHaveCount(0);
});

test('switching to list swaps grid for .list-view with row entries', async ({ app }) => {
  await app.locator('[data-test="view-list"]').click();
  await expect(app.locator('[data-test="view-list"]')).toHaveClass(/active/);
  await expect(app.locator('.list-view')).toBeVisible();
  await expect(app.locator('.grid.mode-grid, .grid.mode-compact')).toHaveCount(0);
  // CoverRow renders an element with the `.row` class for each series.
  await expect(app.locator('.list-view .row')).toHaveCount(6);
});

test('view mode persists across reload', async ({ app }) => {
  await app.locator('[data-test="view-list"]').click();
  // setView wraps the swap in document.startViewTransition, so the storage write
  // lands one tick after the click — wait for the visual swap to settle first.
  await expect(app.locator('.list-view')).toBeVisible();
  await expect.poll(async () =>
    app.evaluate(() => localStorage.getItem('aan.lib.view'))
  ).toBe('list');

  await app.reload({ waitUntil: 'domcontentloaded' });
  const lib = new LibraryPage(app);
  await lib.open();

  expect(await app.evaluate(() => localStorage.getItem('aan.lib.view'))).toBe('list');
  await expect(app.locator('[data-test="view-list"]')).toHaveClass(/active/);
  await expect(app.locator('.list-view')).toBeVisible();
});
