import { test, expect } from '../fixtures/app';
import { SettingsPage } from '../pages/SettingsPage';
import { SidebarPage } from '../pages/SidebarPage';

test('theme switch + persists across reload', async ({ app }) => {
  const settings = new SettingsPage(app);
  const side = new SidebarPage(app);

  await settings.open();
  await settings.pickTheme('light');
  await expect.poll(async () => settings.themeIsActive('light')).toBe(true);

  // Reload the renderer — same Tauri process, but rehydrates from localStorage.
  await app.reload();
  await side.go('settings');
  await settings.expandSection('appearance');
  await expect.poll(async () => settings.themeIsActive('light')).toBe(true);

  // Restore default so later specs aren't affected.
  await settings.pickTheme('dark');
});
