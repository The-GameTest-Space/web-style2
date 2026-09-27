import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/base.css'

// Content comes from MSW mocks until a real backend exists. Mocks run in
// development, and in production builds when VITE_ENABLE_MOCKS is not 'false'.
async function enableMocking() {
  if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'false') return

  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}

enableMocking().then(() => {
  const app = createApp(App)

  app.use(router)

  app.mount('#app')
})
