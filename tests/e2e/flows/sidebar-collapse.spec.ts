import { test, expect } from '../fixtures/app';
import { SidebarPage } from '../pages/SidebarPage';

test('collapse hides labels, expand restores them', async ({ app }) => {
  const side = new SidebarPage(app);
  await side.go('home');

  const collapsedBefore = await side.isCollapsed();
  if (collapsedBefore) await side.toggleCollapse();
  expect(await side.isCollapsed()).toBe(false);

  await side.toggleCollapse();
  expect(await side.isCollapsed()).toBe(true);

  await side.toggleCollapse();
  expect(await side.isCollapsed()).toBe(false);
});
