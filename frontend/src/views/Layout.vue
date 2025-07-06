<template>
  <n-layout class="app-layout" has-sider>
    <!-- Sidebar -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="sidebarCollapsed"
      show-trigger
      @collapse="setSidebarCollapsed(true)"
      @expand="setSidebarCollapsed(false)"
    >
      <div class="sidebar-header">
        <div class="logo">
          <n-icon size="32" color="#18a058">
            <DatabaseIcon />
          </n-icon>
          <span v-if="!sidebarCollapsed" class="logo-text">
            {{ $t('nav.title') }}
          </span>
        </div>
      </div>
      
      <n-menu
        :collapsed="sidebarCollapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeMenu"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <!-- Main Content -->
    <n-layout>
      <!-- Header -->
      <n-layout-header bordered class="app-header">
        <div class="header-content">
          <div class="header-left">
            <n-breadcrumb>
              <n-breadcrumb-item>
                <router-link to="/dashboard">
                  {{ $t('nav.dashboard') }}
                </router-link>
              </n-breadcrumb-item>
              <n-breadcrumb-item v-if="currentRoute?.name && currentRoute.name !== 'Dashboard'">
                {{ currentRoute.meta?.title ? $t(currentRoute.meta.title as string) : '' }}
              </n-breadcrumb-item>
            </n-breadcrumb>
          </div>
          
          <div class="header-right">
            <!-- Auto Refresh Toggle -->
            <n-tooltip :disabled="sidebarCollapsed">
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  @click="toggleAutoRefresh"
                >
                  <template #icon>
                    <n-icon :color="autoRefresh ? '#18a058' : '#999'">
                      <RefreshIcon />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              {{ $t('dashboard.autoRefresh') }}: {{ autoRefresh ? 'ON' : 'OFF' }}
            </n-tooltip>

            <!-- Theme Toggle -->
            <n-tooltip>
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  @click="toggleTheme"
                >
                  <template #icon>
                    <n-icon>
                      <component :is="isDarkMode ? SunIcon : MoonIcon" />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              {{ $t('settings.theme') }}
            </n-tooltip>

            <!-- Language Toggle -->
            <n-tooltip>
              <template #trigger>
                <n-button
                  quaternary
                  circle
                  @click="toggleLanguage"
                >
                  <template #icon>
                    <n-icon>
                      <LanguageIcon />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              {{ $t('settings.language') }}
            </n-tooltip>

            <!-- User Menu -->
            <n-dropdown
              trigger="click"
              :options="userMenuOptions"
              @select="handleUserMenuSelect"
            >
              <n-button quaternary circle>
                <template #icon>
                  <n-icon>
                    <PersonIcon />
                  </n-icon>
                </template>
              </n-button>
            </n-dropdown>
          </div>
        </div>
      </n-layout-header>

      <!-- Content -->
      <n-layout-content class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDialog, useMessage, type MenuOption } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import {
  Server as DatabaseIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  Moon as MoonIcon,
  Sunny as SunIcon,
  Refresh as RefreshIcon,
  SpeedometerOutline as DashboardIcon,
  ListOutline as TasksIcon,
  DocumentTextOutline as LogsIcon,
  Server as StoragesIcon,
  NotificationsOutline as NotificationsIcon,
  StatsChartOutline as StatisticsIcon,
  SettingsOutline as SettingsIcon,
  LogOutOutline as LogoutIcon,
  KeyOutline as PasswordIcon
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const dialog = useDialog()
const message = useMessage()
const authStore = useAuthStore()
const appStore = useAppStore()
const { t } = useI18n()

// Computed properties
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
const isDarkMode = computed(() => appStore.isDarkMode)
const autoRefresh = computed(() => appStore.autoRefresh)
const currentRoute = computed(() => route)
const activeMenu = computed(() => route.name as string)

// Menu options
const menuOptions = computed((): MenuOption[] => [
  {
    label: t('nav.dashboard'),
    key: 'Dashboard',
    icon: () => h(DashboardIcon)
  },
  {
    label: t('nav.tasks'),
    key: 'Tasks',
    icon: () => h(TasksIcon)
  },
  {
    label: t('nav.logs'),
    key: 'Logs',
    icon: () => h(LogsIcon)
  },
  {
    label: t('nav.storages'),
    key: 'Storages',
    icon: () => h(StoragesIcon)
  },
  {
    label: t('nav.notifications'),
    key: 'Notifications',
    icon: () => h(NotificationsIcon)
  },
  {
    label: t('nav.statistics'),
    key: 'Statistics',
    icon: () => h(StatisticsIcon)
  },
  {
    label: t('nav.settings'),
    key: 'Settings',
    icon: () => h(SettingsIcon)
  }
])

// User menu options
const userMenuOptions = computed(() => [
  {
    label: authStore.username,
    key: 'username',
    disabled: true
  },
  {
    type: 'divider'
  },
  {
    label: t('auth.changePassword'),
    key: 'changePassword',
    icon: () => h(PasswordIcon)
  },
  {
    label: t('auth.logout'),
    key: 'logout',
    icon: () => h(LogoutIcon)
  }
])

// Methods
const setSidebarCollapsed = (collapsed: boolean) => {
  appStore.setSidebarCollapsed(collapsed)
}

const handleMenuSelect = (key: string) => {
  console.log('Layout: menu selected:', key)
  router.push({ name: key })
}

const toggleAutoRefresh = () => {
  appStore.setAutoRefresh(!autoRefresh.value)
  message.info(
    t('dashboard.autoRefresh') + ': ' + (autoRefresh.value ? 'ON' : 'OFF')
  )
}

const toggleTheme = () => {
  console.log('Layout: toggleTheme clicked, current theme:', appStore.theme)
  const newTheme = isDarkMode.value ? 'light' : 'dark'
  console.log('Layout: switching to theme:', newTheme)
  appStore.setTheme(newTheme)
  message.success(`主题已切换到: ${newTheme === 'dark' ? '暗色' : '亮色'}`)
}

const toggleLanguage = () => {
  console.log('Layout: toggleLanguage clicked, current language:', appStore.currentLanguage)
  const newLanguage = appStore.currentLanguage === 'zh' ? 'en' : 'zh'
  console.log('Layout: switching to language:', newLanguage)
  appStore.setLanguage(newLanguage)
  message.success(`语言已切换到: ${newLanguage}`)
}

const handleUserMenuSelect = (key: string) => {
  switch (key) {
    case 'changePassword':
      // TODO: Implement change password modal
      message.info('Change password feature coming soon')
      break
    case 'logout':
      dialog.warning({
        title: t('auth.logout'),
        content: '确认退出登录？',
        positiveText: t('common.confirm'),
        negativeText: t('common.cancel'),
        onPositiveClick: async () => {
          await authStore.logout()
          message.success(t('auth.logoutSuccess'))
          router.push('/login')
        }
      })
      break
  }
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.logo-text {
  white-space: nowrap;
  overflow: hidden;
}

.app-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-content {
  padding: 24px;
  overflow: auto;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .app-content {
    padding: 16px;
  }
  
  .header-content {
    padding: 0 16px;
  }
}
</style>
