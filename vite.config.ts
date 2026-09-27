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
    // MSW answers the mocked /api routes in the browser; everything else under
    // /api (e.g. Discord sign-in) goes to the deployed Worker.
    proxy: {
      '/api': { target: 'https://gtspace.gametestspace.workers.dev', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
