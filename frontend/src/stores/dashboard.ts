import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DashboardStats, SystemHealth, StatisticsData } from '@/types'
import { api } from '@/api'
import { useAppStore } from './app'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const stats = ref<DashboardStats | null>(null)
  const systemHealth = ref<SystemHealth | null>(null)
  const statistics = ref<StatisticsData | null>(null)
  const isLoading = ref(false)
  const lastUpdated = ref<Date | null>(null)
  const autoRefreshTimer = ref<number | null>(null)

  // Getters
  const totalTasks = computed(() => stats.value?.tasks.total || 0)
  const activeTasks = computed(() => stats.value?.tasks.active || 0)
  const runningBackups = computed(() => stats.value?.runningBackups.length || 0)
  const successRate = computed(() => stats.value?.backups.successRate || 0)
  const recentLogs = computed(() => stats.value?.recentLogs || [])
  const nextRuns = computed(() => stats.value?.nextRuns || [])
  const systemStatus = computed(() => systemHealth.value?.status || 'unknown')
  const isSystemHealthy = computed(() => systemStatus.value === 'healthy')

  // Actions
  const loadOverview = async () => {
    isLoading.value = true
    try {
      const response = await api.getDashboardOverview()
      if (response.success && response.data) {
        stats.value = response.data
        lastUpdated.value = new Date()
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to load dashboard data' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load dashboard data' }
    } finally {
      isLoading.value = false
    }
  }

  const loadSystemHealth = async () => {
    try {
      const response = await api.getSystemHealth()
      if (response.success && response.data) {
        systemHealth.value = response.data
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to load system health' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load system health' }
    }
  }

  const loadStatistics = async (days = 30) => {
    try {
      const response = await api.getDashboardStatistics(days)
      if (response.success && response.data) {
        statistics.value = response.data
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to load statistics' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load statistics' }
    }
  }

  const performCleanup = async (retentionDays = 30) => {
    try {
      const response = await api.performCleanup(retentionDays)
      if (response.success) {
        // Refresh data after cleanup
        await loadOverview()
        return { success: true, data: response.data }
      }
      return { success: false, error: response.error || 'Cleanup failed' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Cleanup failed' }
    }
  }

  const exportData = async (format = 'json') => {
    try {
      const response = await api.exportData(format)
      if (response.success && response.data) {
        // Create download
        const dataStr = JSON.stringify(response.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `backup-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        return { success: true }
      }
      return { success: false, error: response.error || 'Export failed' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Export failed' }
    }
  }

  const refresh = async () => {
    const results = await Promise.allSettled([
      loadOverview(),
      loadSystemHealth()
    ])
    
    const overviewResult = results[0]
    const healthResult = results[1]
    
    if (overviewResult.status === 'fulfilled' && overviewResult.value.success &&
        healthResult.status === 'fulfilled' && healthResult.value.success) {
      return { success: true }
    }
    
    const errors = []
    if (overviewResult.status === 'rejected' || !overviewResult.value.success) {
      errors.push(overviewResult.status === 'rejected' ? overviewResult.reason : overviewResult.value.error)
    }
    if (healthResult.status === 'rejected' || !healthResult.value.success) {
      errors.push(healthResult.status === 'rejected' ? healthResult.reason : healthResult.value.error)
    }
    
    return { success: false, error: errors.join('; ') }
  }

  const startAutoRefresh = () => {
    const appStore = useAppStore()
    
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
    }
    
    if (appStore.autoRefresh) {
      autoRefreshTimer.value = window.setInterval(() => {
        refresh()
      }, appStore.refreshInterval)
    }
  }

  const stopAutoRefresh = () => {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
      autoRefreshTimer.value = null
    }
  }

  const init = async () => {
    await refresh()
    startAutoRefresh()
  }

  const destroy = () => {
    stopAutoRefresh()
  }

  return {
    // State
    stats,
    systemHealth,
    statistics,
    isLoading,
    lastUpdated,
    
    // Getters
    totalTasks,
    activeTasks,
    runningBackups,
    successRate,
    recentLogs,
    nextRuns,
    systemStatus,
    isSystemHealthy,
    
    // Actions
    loadOverview,
    loadSystemHealth,
    loadStatistics,
    performCleanup,
    exportData,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    init,
    destroy
  }
})
