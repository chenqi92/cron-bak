<template>
  <div class="ui-test">
    <n-card title="UI组件测试">
      <n-space vertical>
        <n-alert title="测试信息" type="info">
          这个页面用于测试Naive UI组件是否正常工作
        </n-alert>

        <n-divider>按钮测试</n-divider>
        <n-space>
          <n-button type="primary" @click="handlePrimary">主要按钮</n-button>
          <n-button type="info" @click="handleInfo">信息按钮</n-button>
          <n-button type="success" @click="handleSuccess">成功按钮</n-button>
          <n-button type="warning" @click="handleWarning">警告按钮</n-button>
          <n-button type="error" @click="handleError">错误按钮</n-button>
        </n-space>

        <n-divider>主题和语言测试</n-divider>
        <n-space>
          <n-button @click="toggleTheme">
            切换主题 (当前: {{ isDarkMode ? '暗色' : '亮色' }})
          </n-button>
          <n-button @click="toggleLanguage">
            切换语言 (当前: {{ currentLanguage }})
          </n-button>
        </n-space>

        <n-divider>图标测试</n-divider>
        <n-space>
          <n-button>
            <template #icon>
              <n-icon><RefreshIcon /></n-icon>
            </template>
            刷新
          </n-button>
          <n-button>
            <template #icon>
              <n-icon><SettingsIcon /></n-icon>
            </template>
            设置
          </n-button>
          <n-button>
            <template #icon>
              <n-icon><HomeIcon /></n-icon>
            </template>
            首页
          </n-button>
        </n-space>

        <n-divider>导航测试</n-divider>
        <n-space>
          <n-button @click="goTo('/dashboard')">仪表板</n-button>
          <n-button @click="goTo('/tasks')">任务管理</n-button>
          <n-button @click="goTo('/logs')">日志查看</n-button>
          <n-button @click="goTo('/settings')">设置</n-button>
        </n-space>

        <n-divider>状态显示</n-divider>
        <n-descriptions bordered :column="2">
          <n-descriptions-item label="认证状态">
            {{ authStore.isAuthenticated ? '已认证' : '未认证' }}
          </n-descriptions-item>
          <n-descriptions-item label="用户名">
            {{ authStore.username || '未知' }}
          </n-descriptions-item>
          <n-descriptions-item label="当前主题">
            {{ isDarkMode ? '暗色模式' : '亮色模式' }}
          </n-descriptions-item>
          <n-descriptions-item label="当前语言">
            {{ currentLanguage }}
          </n-descriptions-item>
        </n-descriptions>

        <n-divider>对话框测试</n-divider>
        <n-space>
          <n-button @click="showDialog">显示对话框</n-button>
          <n-button @click="showNotification">显示通知</n-button>
        </n-space>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog, useNotification } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Home as HomeIcon
} from '@vicons/ionicons5'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const notification = useNotification()
const authStore = useAuthStore()
const appStore = useAppStore()

const isDarkMode = computed(() => appStore.isDarkMode)
const currentLanguage = computed(() => appStore.currentLanguage)

const handlePrimary = () => {
  message.success('主要按钮点击成功！')
}

const handleInfo = () => {
  message.info('信息按钮点击成功！')
}

const handleSuccess = () => {
  message.success('成功按钮点击成功！')
}

const handleWarning = () => {
  message.warning('警告按钮点击成功！')
}

const handleError = () => {
  message.error('错误按钮点击成功！')
}

const toggleTheme = () => {
  const newTheme = isDarkMode.value ? 'light' : 'dark'
  appStore.setTheme(newTheme)
  message.success(`主题已切换到: ${newTheme === 'dark' ? '暗色' : '亮色'}`)
}

const toggleLanguage = () => {
  const newLanguage = currentLanguage.value === 'zh' ? 'en' : 'zh'
  appStore.setLanguage(newLanguage)
  message.success(`语言已切换到: ${newLanguage}`)
}

const goTo = (path: string) => {
  router.push(path)
  message.info(`导航到: ${path}`)
}

const showDialog = () => {
  dialog.info({
    title: '测试对话框',
    content: '这是一个测试对话框，用于验证useDialog是否正常工作。',
    positiveText: '确定',
    onPositiveClick: () => {
      message.success('对话框确定按钮点击成功！')
    }
  })
}

const showNotification = () => {
  notification.create({
    title: '测试通知',
    content: '这是一个测试通知，用于验证useNotification是否正常工作。',
    type: 'success',
    duration: 3000
  })
}
</script>

<style scoped>
.ui-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
