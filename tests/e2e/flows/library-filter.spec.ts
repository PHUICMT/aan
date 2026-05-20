import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';

// Fixture counts (see tests/fixtures/README.md):
//  manga 3 (1001, 1002, 3001) · comic 1 (1003) · novel 1 (2001) · original_novel 1 (2002).

test.beforeEach(async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.open();
  // reset state from earlier tests
  await lib.setType('all');
  await lib.searchFor('');
});

test('type filter: manga narrows to 3', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setType('manga');
  await expect(lib.cards()).toHaveCount(3);
});

test('type filter: comic narrows to 1', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setType('comic');
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(1003)).toBeVisible();
});

test('type filter: novel narrows to 1', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setType('novel');
  await expect(lib.cards()).toHaveCount(1);
  await expect(lib.card(2001)).toBeVisible();
});

test('search by name', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.searchFor('Alpha');
  await expect(lib.card(1001)).toBeVisible();
  await expect(lib.cards()).toHaveCount(1);
});

test('dl filter: missing-only shows the partial series', async ({ app }) => {
  const lib = new LibraryPage(app);
  await lib.setDl('missing');
  await expect(lib.card(3001)).toBeVisible();
});
