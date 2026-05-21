import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';

// Reading-status + download sub-filter coverage, extending the type-filter
// suite in library-filter.spec.ts. Seed RS values per fixtures/seeds.ts:
//  1001=reading · 1002=plan · 1003=on_hold · 2001=reading
//  2002=null    · 3001=dropped
// DL: 3001 is the only partial (2/10); everyone else is local >= total.

// Track any pid whose reading_status this spec mutates, so afterEach can
// restore the seed value. Keep restoration scoped — wiping 1002's plan
// would strip engagement and break downstream specs that expect 6 cards.
const SEED_RS: Record<number, string | null> = {
  1001: 'reading',
  1002: 'plan',
  1003: 'on_hold',
  2001: 'reading',
  2002: null,
  3001: 'dropped',
};
const mutatedPids = new Set<number>();

test.afterEach(async ({ app }) => {
  for (const pid of mutatedPids) {
    try {
      await invokeCmd(app, 'set_reading_status', { pid, status: SEED_RS[pid] });
    } catch {}
  }
  mutatedPids.clear();
});

test.beforeEach(async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.open();
});

test('reading-status filter: plan narrows to series 1002', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setRs('plan');
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(1002)).toBeVisible();
});

test('reading-status filter: reading narrows to 1001 + 2001', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setRs('reading');
  await expect(lib.cards()).toHaveCount(2);
  await expect(lib.card(1001)).toBeVisible();
  await expect(lib.card(2001)).toBeVisible();
});

test('reading-status filter: none narrows to series 2002', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setRs('none');
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(2002)).toBeVisible();
});

test('reading-status filter: clears via filter-rs-all', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setRs('dropped');
  await expect(lib.cards()).toHaveCount(1);
  await lib.setRs('all');
  await expect(lib.cards()).toHaveCount(6);
});

test('reading-status filter persists across reload', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setRs('on_hold');
  await expect(lib.cards()).toHaveCount(1);
  // Confirm persistence key was written before reload.
  const before = await app.evaluate(() => localStorage.getItem('aan.lib.rs'));
  expect(before).toBe('on_hold');
  await app.reload({ waitUntil: 'domcontentloaded' });
  await app.locator('[data-test="nav-library"]').click();
  await expect(app.locator('[data-test="library"]')).toBeVisible();
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(1003)).toBeVisible();
  const after = await app.evaluate(() => localStorage.getItem('aan.lib.rs'));
  expect(after).toBe('on_hold');
});

test('download filter: complete narrows to series with local >= total', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setDl('complete');
  // 1001 (4/4), 1002 (0/0), 1003 (1/1), 2001 (2/2), 2002 (1/1) — 5 series.
  await expect(lib.cards()).toHaveCount(5);
  await expect(lib.card(3001)).toHaveCount(0);
});

test('download filter persists across reload', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setDl('missing');
  await expect(lib.card(3001)).toBeVisible();
  const before = await app.evaluate(() => localStorage.getItem('aan.lib.dl'));
  expect(before).toBe('missing');
  await app.reload({ waitUntil: 'domcontentloaded' });
  await app.locator('[data-test="nav-library"]').click();
  await expect(app.locator('[data-test="library"]')).toBeVisible();
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(3001)).toBeVisible();
  const after = await app.evaluate(() => localStorage.getItem('aan.lib.dl'));
  expect(after).toBe('missing');
});

test('combined type + rs + dl narrows multiplicatively to series 1001', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setType('manga');
  await expect(lib.cards()).toHaveCount(3);
  await lib.setRs('reading');
  // manga ∩ reading = 1001 only (2001 is novel).
  await expect(lib.cards()).toHaveCount(1);
  await lib.setDl('complete');
  // 1001 is 4/4 so it survives.
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(1001)).toBeVisible();
});
