import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { loadMessages } from './i18n'
import './styles/base.css'

// Before the router starts: its first navigation sets the tab title.
await loadMessages()

const app = createApp(App)

app.use(router)

app.mount('#app')
