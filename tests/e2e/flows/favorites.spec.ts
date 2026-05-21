import { test, expect, invokeCmd } from '../fixtures/app';

// Fixture seeds 1001 (manga) and 2001 (novel) as favorites. Tests that need
// a different starting state mutate via set_series_favorite and restore in
// afterEach so downstream specs still see the expected catalog.
const SEED_FAV: Record<number, boolean> = {
  1001: true,
  1002: false,
  1003: false,
  2001: true,
  2002: false,
  3001: false,
};
const mutated = new Set<number>();

async function setFav(app: Parameters<typeof invokeCmd>[0], pid: number, fav: boolean) {
  await invokeCmd(app, 'set_series_favorite', { pid, fav });
  mutated.add(pid);
}

test.afterEach(async ({ app }) => {
  for (const pid of mutated) {
    try {
      await invokeCmd(app, 'set_series_favorite', { pid, fav: SEED_FAV[pid] });
    } catch {}
  }
  mutated.clear();
});

async function openFavorites(app: Parameters<typeof invokeCmd>[0]) {
  // Bounce via library to force Favorites to remount and refetch — the
  // page caches on first mount, so going straight there after a mutation
  // can show stale state.
  await app.locator('[data-test="nav-library"]').click();
  await app.waitForTimeout(120);
  await app.locator('[data-test="nav-favorites"]').click();
  await expect(app.locator('[data-test="favorites-page"]')).toBeVisible();
}

test('empty state when no favorites exist', async ({ app }) => {
  // Strip the two seeded favorites for this case.
  await setFav(app, 1001, false);
  await setFav(app, 2001, false);

  await openFavorites(app);
  await expect(app.locator('[data-test="favorites-empty"]')).toBeVisible();
  await expect(app.locator('[data-test="cover-card"]')).toHaveCount(0);
});

test('favoriting a series makes it appear in Favorites', async ({ app }) => {
  // Start from a clean slate so the assertion is about the toggle, not seeds.
  await setFav(app, 1001, false);
  await setFav(app, 2001, false);
  await setFav(app, 1002, true);

  await openFavorites(app);
  await expect(app.locator('[data-test="cover-card"][data-pid="1002"]')).toBeVisible();
  await expect(app.locator('[data-test="cover-card"]')).toHaveCount(1);
});

test('type filter narrows favorites to manga', async ({ app }) => {
  // Seed has 1001 (manga) + 2001 (novel) — perfect for type narrowing.
  await openFavorites(app);
  await expect(app.locator('[data-test="cover-card"]')).toHaveCount(2);

  await app.locator('[data-test="favorites-page"] [data-test="filter-type-manga"]').click();
  await expect(app.locator('[data-test="cover-card"]')).toHaveCount(1);
  await expect(app.locator('[data-test="cover-card"][data-pid="1001"]')).toBeVisible();
});

test('unfavoriting via Series Detail removes from Favorites grid', async ({ app }) => {
  // 1001 starts favorited via seed; flip it off through the detail toggle
  // and confirm the auto-prune + refetch path drops it from the grid.
  await openFavorites(app);
  await expect(app.locator('[data-test="cover-card"][data-pid="1001"]')).toBeVisible();

  await app.locator('[data-test="cover-card"][data-pid="1001"]').click();
  await expect(app.locator('[data-test="series-detail"]')).toBeVisible();
  await app.locator('[data-test="series-fav"]').click();
  mutated.add(1001); // ensure afterEach restores

  await openFavorites(app);
  await expect(app.locator('[data-test="cover-card"][data-pid="1001"]')).toHaveCount(0);
  // 2001 is still favorited.
  await expect(app.locator('[data-test="cover-card"][data-pid="2001"]')).toBeVisible();
});

test('favorites type filter selection persists across reload', async ({ app }) => {
  // Seeded favorites already cover manga + novel.
  await openFavorites(app);
  await app.locator('[data-test="favorites-page"] [data-test="filter-type-manga"]').click();

  const before = await app.evaluate(() => localStorage.getItem('aan.fav.type'));
  expect(before).toBe('manga');

  await app.reload({ waitUntil: 'domcontentloaded' });
  await app.locator('[data-test="nav-favorites"]').click();
  await expect(app.locator('[data-test="favorites-page"]')).toBeVisible();

  const after = await app.evaluate(() => localStorage.getItem('aan.fav.type'));
  expect(after).toBe('manga');
  await expect(app.locator('[data-test="cover-card"]')).toHaveCount(1);
  await expect(app.locator('[data-test="cover-card"][data-pid="1001"]')).toBeVisible();
});
