import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

async function enableMocking() {
  if (!import.meta.env.DEV) return

  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  const app = createApp(App)

  app.use(router)

  app.mount('#app')
})
