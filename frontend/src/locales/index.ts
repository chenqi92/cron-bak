import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'

const messages = {
  zh,
  en
}

// Get saved language or default to Chinese
const savedLanguage = localStorage.getItem('appSettings')
let defaultLocale = 'zh'

if (savedLanguage) {
  try {
    const settings = JSON.parse(savedLanguage)
    defaultLocale = settings.language || 'zh'
  } catch (error) {
    console.error('Failed to parse saved language:', error)
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'zh',
  messages,
  globalInjection: true
})

export default i18n
