import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    // /api is the Worker in worker/. The dev server uses the deployed one;
    // API_TARGET=http://localhost:8787 points it at a local `wrangler dev`.
    proxy: {
      '/api': { target: process.env.API_TARGET ?? 'https://gtspace.gametestspace.workers.dev', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
