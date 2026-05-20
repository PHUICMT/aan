import { test, expect } from '../fixtures/app';
import { HomePage } from '../pages/HomePage';
import { SidebarPage } from '../pages/SidebarPage';
import { SeriesDetailPage } from '../pages/SeriesDetailPage';

test('pick random opens modal, reroll changes content, read opens series', async ({ app }) => {
  const home = new HomePage(app);
  const side = new SidebarPage(app);
  const detail = new SeriesDetailPage(app);

  await side.go('home');
  await home.pickRandom();
  const firstName = await home.pickedName().textContent();

  // Reroll up to 5 times to dodge the rare same-pick case.
  let changed = false;
  for (let i = 0; i < 5; i++) {
    await home.reroll();
    const next = await home.pickedName().textContent();
    if (next && next !== firstName) { changed = true; break; }
  }
  expect(changed, 'reroll should land on a different series within 5 tries').toBe(true);

  await home.readPicked();
  await expect(detail.root()).toBeVisible();
});
