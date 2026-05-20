import { test, expect } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { SidebarPage } from '../pages/SidebarPage';

test('series 1001 shows 4 chapter rows', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  await lib.open();
  await lib.clickSeriesByPid(1001);
  await detail.waitLoaded();
  await expect(detail.chapterRows()).toHaveCount(4);
});

test('favorite toggle persists across nav-away-and-back', async ({ app }) => {
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const side = new SidebarPage(app);

  await lib.open();
  await lib.clickSeriesByPid(1003); // not favorite in seed
  await detail.waitLoaded();

  const before = await detail.favoriteIsOn();
  await detail.toggleFavorite();
  await expect.poll(async () => detail.favoriteIsOn()).toBe(!before);

  await side.go('library');
  await lib.clickSeriesByPid(1003);
  await detail.waitLoaded();
  await expect.poll(async () => detail.favoriteIsOn()).toBe(!before);

  // restore so other tests aren't disturbed
  await detail.toggleFavorite();
});
