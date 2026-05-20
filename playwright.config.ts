import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/flows',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['html', { outputFolder: 'tests/e2e/.report', open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  globalSetup: './tests/e2e/fixtures/global-setup.ts',
  globalTeardown: './tests/e2e/fixtures/global-teardown.ts',
});
