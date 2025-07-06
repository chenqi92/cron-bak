<template>
  <n-config-provider
    :theme="isDarkMode ? darkTheme : null"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <router-view />
            <GlobalComponents />
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { darkTheme, zhCN, dateZhCN, enUS, dateEnUS } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import GlobalComponents from '@/components/GlobalComponents.vue'

const appStore = useAppStore()
const authStore = useAuthStore()
const { locale } = useI18n()

// Theme
const isDarkMode = computed(() => appStore.isDarkMode)

// Locale
const naiveLocale = computed(() => {
  return appStore.currentLanguage === 'zh' ? zhCN : enUS
})

const naiveDateLocale = computed(() => {
  return appStore.currentLanguage === 'zh' ? dateZhCN : dateEnUS
})

// Initialize app
onMounted(async () => {
  // Hide loading screen
  const loadingElement = document.getElementById('loading')
  if (loadingElement) {
    loadingElement.style.opacity = '0'
    setTimeout(() => {
      loadingElement.remove()
    }, 300)
  }

  // Initialize app store
  appStore.init()

  // Sync i18n locale with app store
  locale.value = appStore.currentLanguage

  // Check authentication status in background
  try {
    await authStore.checkAuthStatus()
  } catch (error) {
    console.error('Auth check failed:', error)
  }

  // Watch for language changes
  const unwatchLanguage = appStore.$subscribe((mutation, state) => {
    if (Array.isArray(mutation.events) && mutation.events.some((event: any) => event.key === 'language')) {
      locale.value = state.language
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unwatchLanguage()
  })
})
</script>

<style>
/* Global styles */
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--body-color);
  transition: color 0.3s ease, background-color 0.3s ease;
}

#app {
  min-height: 100vh;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover-color);
}

/* Light theme variables */
:root {
  --text-color: #333;
  --body-color: #f5f5f5;
  --scrollbar-track-color: #f1f1f1;
  --scrollbar-thumb-color: #c1c1c1;
  --scrollbar-thumb-hover-color: #a8a8a8;
}

/* Dark theme variables */
[data-theme='dark'] {
  --text-color: #e0e0e0;
  --body-color: #1a1a1a;
  --scrollbar-track-color: #2a2a2a;
  --scrollbar-thumb-color: #4a4a4a;
  --scrollbar-thumb-hover-color: #5a5a5a;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

/* Utility classes */
.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.full-width {
  width: 100%;
}

.full-height {
  height: 100%;
}

.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.gap-4 {
  gap: 16px;
}

.gap-5 {
  gap: 20px;
}

.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mt-5 { margin-top: 20px; }

.mb-1 { margin-bottom: 4px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-5 { margin-bottom: 20px; }

.ml-1 { margin-left: 4px; }
.ml-2 { margin-left: 8px; }
.ml-3 { margin-left: 12px; }
.ml-4 { margin-left: 16px; }
.ml-5 { margin-left: 20px; }

.mr-1 { margin-right: 4px; }
.mr-2 { margin-right: 8px; }
.mr-3 { margin-right: 12px; }
.mr-4 { margin-right: 16px; }
.mr-5 { margin-right: 20px; }

.p-1 { padding: 4px; }
.p-2 { padding: 8px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.p-5 { padding: 20px; }

/* Responsive utilities */
@media (max-width: 768px) {
  .mobile-hidden {
    display: none !important;
  }
  
  .mobile-full-width {
    width: 100% !important;
  }
}

@media (min-width: 769px) {
  .desktop-hidden {
    display: none !important;
  }
}
</style>
