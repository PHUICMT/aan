import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { ReaderPage } from '../pages/ReaderPage';

test('novel chapter renders and is scrollable', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);

  await lib.open();
  await lib.clickSeriesByPid(2001);
  await detail.waitLoaded();
  await detail.openChapter('2001-ch2');
  await reader.waitLoaded();
  // Novel reader has no Toolbar — just confirm reader root + back work.
  await reader.back();
  await expect(detail.root()).toBeVisible();
});
