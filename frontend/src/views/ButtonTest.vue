<template>
  <div style="padding: 20px;">
    <h1>按钮功能测试</h1>
    
    <div style="margin: 20px 0;">
      <h2>基本按钮测试</h2>
      <n-space>
        <n-button @click="testClick" type="primary">点击测试</n-button>
        <n-button @click="testMessage" type="info">消息测试</n-button>
        <n-button @click="testTheme" type="warning">主题测试</n-button>
        <n-button @click="testLanguage" type="error">语言测试</n-button>
      </n-space>
    </div>

    <div style="margin: 20px 0;">
      <h2>状态显示</h2>
      <p>点击次数: {{ clickCount }}</p>
      <p>当前主题: {{ isDarkMode ? '暗色' : '亮色' }}</p>
      <p>当前语言: {{ currentLanguage }}</p>
      <p>认证状态: {{ authStore.isAuthenticated ? '已认证' : '未认证' }}</p>
    </div>

    <div style="margin: 20px 0;">
      <h2>导航测试</h2>
      <n-space>
        <n-button @click="goTo('/dashboard')" type="primary">仪表板</n-button>
        <n-button @click="goTo('/tasks')" type="info">任务</n-button>
        <n-button @click="goTo('/logs')" type="warning">日志</n-button>
        <n-button @click="goTo('/settings')" type="error">设置</n-button>
      </n-space>
    </div>

    <div style="margin: 20px 0;">
      <h2>API测试</h2>
      <n-space>
        <n-button @click="testDashboardAPI" type="primary" :loading="apiLoading">
          测试Dashboard API
        </n-button>
        <n-button @click="testTasksAPI" type="info" :loading="apiLoading">
          测试Tasks API
        </n-button>
      </n-space>
      
      <div v-if="apiResult" style="margin-top: 16px;">
        <h3>API结果:</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(apiResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { api } from '@/api'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const appStore = useAppStore()

const clickCount = ref(0)
const apiLoading = ref(false)
const apiResult = ref<any>(null)

const isDarkMode = computed(() => appStore.isDarkMode)
const currentLanguage = computed(() => appStore.currentLanguage)

const testClick = () => {
  clickCount.value++
  console.log('Button clicked, count:', clickCount.value)
  message.success(`按钮点击了 ${clickCount.value} 次`)
}

const testMessage = () => {
  console.log('Message test clicked')
  message.info('这是一个测试消息')
}

const testTheme = () => {
  console.log('Theme test clicked, current theme:', appStore.theme)
  try {
    const newTheme = isDarkMode.value ? 'light' : 'dark'
    console.log('Switching to theme:', newTheme)
    appStore.setTheme(newTheme)
    message.success(`主题已切换到: ${newTheme === 'dark' ? '暗色' : '亮色'}`)
  } catch (error) {
    console.error('Theme switch error:', error)
    message.error('主题切换失败: ' + error)
  }
}

const testLanguage = () => {
  console.log('Language test clicked, current language:', appStore.currentLanguage)
  try {
    const newLanguage = currentLanguage.value === 'zh' ? 'en' : 'zh'
    console.log('Switching to language:', newLanguage)
    appStore.setLanguage(newLanguage)
    message.success(`语言已切换到: ${newLanguage}`)
  } catch (error) {
    console.error('Language switch error:', error)
    message.error('语言切换失败: ' + error)
  }
}

const goTo = (path: string) => {
  console.log('Navigating to:', path)
  try {
    router.push(path)
    message.info(`导航到: ${path}`)
  } catch (error) {
    console.error('Navigation error:', error)
    message.error('导航失败: ' + error)
  }
}

const testDashboardAPI = async () => {
  apiLoading.value = true
  try {
    console.log('Testing dashboard API...')
    const response = await api.getDashboardOverview()
    console.log('Dashboard API response:', response)
    apiResult.value = { type: 'dashboard', response }
    message.success('Dashboard API 测试成功')
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    apiResult.value = { type: 'dashboard', error: error.message || error }
    message.error('Dashboard API 测试失败')
  } finally {
    apiLoading.value = false
  }
}

const testTasksAPI = async () => {
  apiLoading.value = true
  try {
    console.log('Testing tasks API...')
    const response = await api.getTasks()
    console.log('Tasks API response:', response)
    apiResult.value = { type: 'tasks', response }
    message.success('Tasks API 测试成功')
  } catch (error: any) {
    console.error('Tasks API error:', error)
    apiResult.value = { type: 'tasks', error: error.message || error }
    message.error('Tasks API 测试失败')
  } finally {
    apiLoading.value = false
  }
}
</script>
