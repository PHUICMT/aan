import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    // pdfjs ships its worker as a single ~1.2MB file (loaded on-demand
    // when opening the manga reader), so it's never blocking the app
    // shell. Bump the threshold to skip the spurious warning.
    chunkSizeWarningLimit: 1500,
  },
})
