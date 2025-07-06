<template>
  <div class="simple-dashboard">
    <h1>简单仪表板</h1>
    
    <div class="debug-info">
      <h2>认证状态</h2>
      <p>已认证: {{ authStore.isAuthenticated }}</p>
      <p>用户名: {{ authStore.username }}</p>
      <p>Token: {{ authStore.token ? '存在' : '不存在' }}</p>
    </div>
    
    <div class="debug-info">
      <h2>路由信息</h2>
      <p>当前路由: {{ $route.name }}</p>
      <p>路径: {{ $route.path }}</p>
    </div>
    
    <div class="actions">
      <n-button @click="testAPI" type="primary">测试API</n-button>
      <n-button @click="goToTasks" type="info">任务管理</n-button>
      <n-button @click="goToLogs" type="warning">日志查看</n-button>
    </div>
    
    <div v-if="apiResult" class="api-result">
      <h2>API测试结果</h2>
      <pre>{{ JSON.stringify(apiResult, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'

const router = useRouter()
const authStore = useAuthStore()
const apiResult = ref<any>(null)

const testAPI = async () => {
  try {
    console.log('Testing dashboard API...')
    const response = await api.getDashboardOverview()
    console.log('API response:', response)
    apiResult.value = response
  } catch (error: any) {
    console.error('API error:', error)
    apiResult.value = { error: error.message || error }
  }
}

const goToTasks = () => {
  router.push('/tasks')
}

const goToLogs = () => {
  router.push('/logs')
}
</script>

<style scoped>
.simple-dashboard {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.debug-info {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.debug-info h2 {
  margin-top: 0;
  color: #333;
}

.actions {
  margin: 20px 0;
}

.actions .n-button {
  margin-right: 10px;
}

.api-result {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f0f0f0;
}

.api-result pre {
  background: white;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

[data-theme='dark'] .debug-info,
[data-theme='dark'] .api-result {
  background: #2a2a2a;
  border-color: #444;
}

[data-theme='dark'] .debug-info h2 {
  color: #e0e0e0;
}

[data-theme='dark'] .api-result pre {
  background: #1a1a1a;
  color: #e0e0e0;
}
</style>
