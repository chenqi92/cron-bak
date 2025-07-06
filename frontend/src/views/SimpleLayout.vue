<template>
  <div class="simple-layout">
    <!-- Header -->
    <div class="header">
      <h1>备份服务</h1>
      <div class="header-actions">
        <n-button @click="testTheme" type="primary">
          切换主题 (当前: {{ isDarkMode ? '暗色' : '亮色' }})
        </n-button>
        <n-button @click="testLanguage" type="info">
          切换语言 (当前: {{ currentLanguage }})
        </n-button>
        <n-button @click="logout" type="error">
          退出登录
        </n-button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="navigation">
      <n-button @click="goTo('dashboard')" :type="currentRoute === 'Dashboard' ? 'primary' : 'default'">
        仪表板
      </n-button>
      <n-button @click="goTo('tasks')" :type="currentRoute === 'Tasks' ? 'primary' : 'default'">
        任务管理
      </n-button>
      <n-button @click="goTo('logs')" :type="currentRoute === 'Logs' ? 'primary' : 'default'">
        日志查看
      </n-button>
      <n-button @click="goTo('settings')" :type="currentRoute === 'Settings' ? 'primary' : 'default'">
        设置
      </n-button>
      <n-button @click="goTo('debug')" :type="currentRoute === 'Debug' ? 'primary' : 'default'">
        调试
      </n-button>
    </div>

    <!-- Content -->
    <div class="content">
      <router-view />
    </div>

    <!-- Debug Info -->
    <div class="debug-info">
      <h3>调试信息</h3>
      <p>当前路由: {{ currentRoute }}</p>
      <p>认证状态: {{ authStore.isAuthenticated }}</p>
      <p>用户: {{ authStore.username }}</p>
      <p>主题: {{ isDarkMode ? '暗色' : '亮色' }}</p>
      <p>语言: {{ currentLanguage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useMessage } from 'naive-ui'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const message = useMessage()

const currentRoute = computed(() => route.name as string)
const isDarkMode = computed(() => appStore.isDarkMode)
const currentLanguage = computed(() => appStore.currentLanguage)

const testTheme = () => {
  console.log('Theme button clicked')
  const newTheme = isDarkMode.value ? 'light' : 'dark'
  console.log('Switching to theme:', newTheme)
  appStore.setTheme(newTheme)
  message.success(`主题已切换到: ${newTheme === 'dark' ? '暗色' : '亮色'}`)
}

const testLanguage = () => {
  console.log('Language button clicked')
  const newLanguage = currentLanguage.value === 'zh' ? 'en' : 'zh'
  console.log('Switching to language:', newLanguage)
  appStore.setLanguage(newLanguage)
  message.success(`语言已切换到: ${newLanguage}`)
}

const goTo = (routeName: string) => {
  console.log('Navigating to:', routeName)
  router.push({ name: routeName })
}

const logout = async () => {
  console.log('Logout clicked')
  await authStore.logout()
  router.push('/login')
  message.success('已退出登录')
}
</script>

<style scoped>
.simple-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

[data-theme='dark'] .header {
  background: #2a2a2a;
  border-bottom-color: #444;
}

.header h1 {
  margin: 0;
  color: #333;
}

[data-theme='dark'] .header h1 {
  color: #e0e0e0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.navigation {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

[data-theme='dark'] .navigation {
  background: #1a1a1a;
  border-bottom-color: #444;
}

.content {
  flex: 1;
  padding: 24px;
  background: #fff;
}

[data-theme='dark'] .content {
  background: #1a1a1a;
  color: #e0e0e0;
}

.debug-info {
  padding: 16px 24px;
  background: #f9f9f9;
  border-top: 1px solid #ddd;
  font-size: 12px;
}

[data-theme='dark'] .debug-info {
  background: #2a2a2a;
  border-top-color: #444;
  color: #e0e0e0;
}

.debug-info h3 {
  margin: 0 0 8px 0;
}

.debug-info p {
  margin: 4px 0;
}
</style>
