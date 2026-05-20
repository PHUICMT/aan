import { test, expect } from '../fixtures/app';
import { SidebarPage } from '../pages/SidebarPage';
import { LibraryPage } from '../pages/LibraryPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';
import { ReaderPage } from '../pages/ReaderPage';

test('home -> library -> series -> reader -> back chain', async ({ app }) => {
  const side = new SidebarPage(app);
  const lib = new LibraryPage(app);
  const detail = new SeriesDetailPage(app);
  const reader = new ReaderPage(app);

  await side.go('home');
  await side.go('library');
  await lib.clickSeriesByPid(1001);
  await detail.waitLoaded();

  await detail.openChapter('1001-ch1');
  await reader.waitLoaded();

  await reader.back();
  await expect(detail.root()).toBeVisible();

  await detail.back();
  await expect(app.locator('[data-test="library"]')).toBeVisible();
});

test('sidebar stays visible across pages', async ({ app }) => {
  const side = new SidebarPage(app);
  for (const id of ['home', 'library', 'favorites', 'history', 'settings'] as const) {
    await side.go(id);
    await expect(side.root()).toBeVisible();
  }
});
