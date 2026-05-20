import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: { hmr: false },
  resolve: {
    // Force the browser build of Svelte so mount()/render() work — without
    // this Vitest picks the SSR build via the 'node' condition.
    conditions: ['browser'],
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: [
        'src/shared/lib/**/*.{ts,svelte.ts}',
        'src/features/**/composables/**/*.{ts,svelte.ts}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.svelte',
        'node_modules/**',
        'tests/**',
      ],
    },
  },
});
