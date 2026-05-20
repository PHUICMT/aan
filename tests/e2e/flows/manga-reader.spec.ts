import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { ReaderPage } from '../pages/ReaderPage';

test('open 1001-ch1 (1 page) and back to series', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);

  await lib.open();
  await lib.clickSeriesByPid(1001);
  await detail.waitLoaded();
  await detail.openChapter('1001-ch1');
  await reader.waitLoaded();
  await expect(reader.toolbar()).toBeVisible();

  await reader.back();
  await expect(detail.root()).toBeVisible();
});

test('open 1001-ch3 (20 pages) and Next does not throw', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);

  await lib.open();
  await lib.clickSeriesByPid(1001);
  await detail.waitLoaded();
  await detail.openChapter('1001-ch3');
  await reader.waitLoaded();
  await expect(reader.toolbar()).toBeVisible();
  await reader.next();
  // Indicator updates on scroll; just confirm we're still in the reader.
  await expect(reader.root()).toBeVisible();
});
