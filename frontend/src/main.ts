import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './locales'

// Import Naive UI - use full import for simplicity
import naive from 'naive-ui'

// Import global styles
// import './assets/styles/main.css'

console.log('main.ts: Starting application...')

// Create Vue app
const app = createApp(App)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Error info:', info)
}

// Global warning handler
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Global warning:', msg)
  console.warn('Warning trace:', trace)
}

// Use plugins
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(naive)

console.log('main.ts: Plugins registered, mounting app...')

// Mount app
app.mount('#app')

console.log('main.ts: App mounted successfully')


