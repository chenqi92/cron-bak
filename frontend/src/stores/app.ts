import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Theme, Language, AppSettings } from '@/types'

export const useAppStore = defineStore('app', () => {
  // State
  const theme = ref<Theme>('auto')
  const language = ref<Language>('zh')
  const autoRefresh = ref(true)
  const refreshInterval = ref(30000) // 30 seconds
  const sidebarCollapsed = ref(false)
  const loading = ref(false)

  // Getters
  const isDarkMode = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    // Auto mode - check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const currentLanguage = computed(() => language.value)

  const settings = computed((): AppSettings => ({
    theme: theme.value,
    language: language.value,
    autoRefresh: autoRefresh.value,
    refreshInterval: refreshInterval.value
  }))

  // Actions
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    saveSettings()
    applyTheme()
  }

  const setLanguage = (newLanguage: Language) => {
    language.value = newLanguage
    saveSettings()
  }

  const setAutoRefresh = (enabled: boolean) => {
    autoRefresh.value = enabled
    saveSettings()
  }

  const setRefreshInterval = (interval: number) => {
    refreshInterval.value = interval
    saveSettings()
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }

  const applyTheme = () => {
    const root = document.documentElement
    if (isDarkMode.value) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }

  const saveSettings = () => {
    const settingsData = {
      theme: theme.value,
      language: language.value,
      autoRefresh: autoRefresh.value,
      refreshInterval: refreshInterval.value
    }
    localStorage.setItem('appSettings', JSON.stringify(settingsData))
  }

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('appSettings')
      if (saved) {
        const settingsData = JSON.parse(saved) as AppSettings
        theme.value = settingsData.theme || 'auto'
        language.value = settingsData.language || 'zh'
        autoRefresh.value = settingsData.autoRefresh ?? true
        refreshInterval.value = settingsData.refreshInterval || 30000
      }

      // Load sidebar state
      const sidebarState = localStorage.getItem('sidebarCollapsed')
      if (sidebarState !== null) {
        sidebarCollapsed.value = sidebarState === 'true'
      }

      applyTheme()
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const resetSettings = () => {
    theme.value = 'auto'
    language.value = 'zh'
    autoRefresh.value = true
    refreshInterval.value = 30000
    sidebarCollapsed.value = false
    
    localStorage.removeItem('appSettings')
    localStorage.removeItem('sidebarCollapsed')
    applyTheme()
  }

  // Initialize
  const init = () => {
    loadSettings()
    
    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'auto') {
        applyTheme()
      }
    })

    // Watch theme changes
    watch(theme, applyTheme, { immediate: true })
  }

  return {
    // State
    theme,
    language,
    autoRefresh,
    refreshInterval,
    sidebarCollapsed,
    loading,
    
    // Getters
    isDarkMode,
    currentLanguage,
    settings,
    
    // Actions
    setTheme,
    setLanguage,
    setAutoRefresh,
    setRefreshInterval,
    toggleSidebar,
    setSidebarCollapsed,
    setLoading,
    applyTheme,
    saveSettings,
    loadSettings,
    resetSettings,
    init
  }
})
