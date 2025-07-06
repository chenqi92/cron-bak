import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './locales'

// Import global styles
import './assets/styles/main.css'

// Create Vue app
const app = createApp(App)

// Use plugins
app.use(createPinia())
app.use(router)
app.use(i18n)

// Mount app
app.mount('#app')

// Global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err, info)
  // You can send error to monitoring service here
}

// Global warning handler
app.config.warnHandler = (msg, vm, trace) => {
  console.warn('Global warning:', msg, trace)
}
