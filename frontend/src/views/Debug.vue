<template>
  <div class="debug-page">
    <h1>Debug Information</h1>
    
    <div class="debug-section">
      <h2>Authentication State</h2>
      <pre>{{ authDebugInfo }}</pre>
    </div>
    
    <div class="debug-section">
      <h2>Route Information</h2>
      <pre>{{ routeDebugInfo }}</pre>
    </div>
    
    <div class="debug-section">
      <h2>Dashboard Store State</h2>
      <pre>{{ dashboardDebugInfo }}</pre>
    </div>
    
    <div class="debug-section">
      <h2>Actions</h2>
      <n-space>
        <n-button @click="testDashboardAPI" type="primary">Test Dashboard API</n-button>
        <n-button @click="refreshDashboard" type="info">Refresh Dashboard</n-button>
        <n-button @click="checkAuth" type="warning">Check Auth</n-button>
      </n-space>
    </div>
    
    <div v-if="apiTestResult" class="debug-section">
      <h2>API Test Result</h2>
      <pre>{{ apiTestResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { api } from '@/api'

const route = useRoute()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const apiTestResult = ref<any>(null)

const authDebugInfo = computed(() => ({
  isAuthenticated: authStore.isAuthenticated,
  user: authStore.user,
  token: authStore.token ? 'present' : 'missing',
  username: authStore.username
}))

const routeDebugInfo = computed(() => ({
  name: route.name,
  path: route.path,
  fullPath: route.fullPath,
  params: route.params,
  query: route.query,
  meta: route.meta
}))

const dashboardDebugInfo = computed(() => ({
  isLoading: dashboardStore.isLoading,
  stats: dashboardStore.stats,
  systemHealth: dashboardStore.systemHealth,
  lastUpdated: dashboardStore.lastUpdated
}))

const testDashboardAPI = async () => {
  try {
    console.log('Testing dashboard API...')
    const response = await api.getDashboardOverview()
    apiTestResult.value = {
      success: true,
      response
    }
  } catch (error: any) {
    apiTestResult.value = {
      success: false,
      error: error.message || error
    }
  }
}

const refreshDashboard = async () => {
  try {
    const result = await dashboardStore.refresh()
    apiTestResult.value = {
      action: 'refresh',
      result
    }
  } catch (error: any) {
    apiTestResult.value = {
      action: 'refresh',
      error: error.message || error
    }
  }
}

const checkAuth = async () => {
  try {
    const result = await authStore.checkAuthStatus()
    apiTestResult.value = {
      action: 'checkAuth',
      result
    }
  } catch (error: any) {
    apiTestResult.value = {
      action: 'checkAuth',
      error: error.message || error
    }
  }
}
</script>

<style scoped>
.debug-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.debug-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.debug-section h2 {
  margin-top: 0;
  color: #333;
}

pre {
  background: #fff;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid #eee;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

[data-theme='dark'] .debug-section {
  background: #2a2a2a;
  border-color: #444;
}

[data-theme='dark'] .debug-section h2 {
  color: #e0e0e0;
}

[data-theme='dark'] pre {
  background: #1a1a1a;
  border-color: #444;
  color: #e0e0e0;
}
</style>
