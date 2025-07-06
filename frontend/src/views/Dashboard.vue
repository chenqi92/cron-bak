<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1>{{ $t('dashboard.title') }}</h1>
        <p>{{ $t('dashboard.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <n-button
          type="primary"
          :loading="isLoading"
          @click="handleRefresh"
        >
          <template #icon>
            <n-icon>
              <RefreshIcon />
            </n-icon>
          </template>
          {{ $t('common.refresh') }}
        </n-button>
        
        <n-dropdown
          trigger="click"
          :options="actionMenuOptions"
          @select="handleActionSelect"
        >
          <n-button>
            <template #icon>
              <n-icon>
                <SettingsIcon />
              </n-icon>
            </template>
            {{ $t('dashboard.quickActions') }}
          </n-button>
        </n-dropdown>
      </div>
    </div>

    <!-- Stats Cards -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <n-grid-item :span="isMobile ? 2 : 1">
        <StatsCard
          :title="$t('dashboard.totalTasks')"
          :value="totalTasks"
          :trend="{ value: 2, direction: 'up' }"
          color="primary"
          icon="tasks"
        />
      </n-grid-item>
      
      <n-grid-item :span="isMobile ? 2 : 1">
        <StatsCard
          :title="$t('dashboard.activeTasks')"
          :value="activeTasks"
          :trend="{ value: 1, direction: 'up' }"
          color="success"
          icon="play"
        />
      </n-grid-item>
      
      <n-grid-item :span="isMobile ? 2 : 1">
        <StatsCard
          :title="$t('dashboard.runningBackups')"
          :value="runningBackups"
          color="info"
          icon="loading"
          :loading="runningBackups > 0"
        />
      </n-grid-item>
      
      <n-grid-item :span="isMobile ? 2 : 1">
        <StatsCard
          :title="$t('dashboard.successRate')"
          :value="successRate + '%'"
          :progress="successRate"
          color="warning"
          icon="chart"
        />
      </n-grid-item>
    </n-grid>

    <!-- Main Content -->
    <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen" class="mt-4">
      <!-- Charts Section -->
      <n-grid-item :span="isMobile ? 3 : 2">
        <n-card :title="$t('dashboard.backupTrends')" class="chart-card">
          <template #header-extra>
            <n-radio-group v-model:value="chartPeriod" size="small">
              <n-radio-button value="7">7{{ $t('time.days') }}</n-radio-button>
              <n-radio-button value="30">30{{ $t('time.days') }}</n-radio-button>
              <n-radio-button value="90">90{{ $t('time.days') }}</n-radio-button>
            </n-radio-group>
          </template>
          
          <div class="chart-container">
            <BackupTrendsChart
              :data="chartData"
              :loading="chartLoading"
              @period-change="handlePeriodChange"
            />
          </div>
        </n-card>

        <!-- Recent Logs -->
        <n-card :title="$t('dashboard.recentLogs')" class="mt-4">
          <template #header-extra>
            <n-button text type="primary" @click="goToLogs">
              {{ $t('dashboard.viewAll') }}
              <template #icon>
                <n-icon>
                  <ArrowForwardIcon />
                </n-icon>
              </template>
            </n-button>
          </template>
          
          <RecentLogsTable
            :logs="recentLogs"
            :loading="isLoading"
            @view-details="handleViewLogDetails"
          />
        </n-card>
      </n-grid-item>

      <!-- Sidebar -->
      <n-grid-item :span="isMobile ? 3 : 1">
        <!-- System Status -->
        <n-card :title="$t('dashboard.systemStatus')" class="system-card">
          <SystemStatus
            :health="systemHealth"
            :loading="isLoading"
            @health-check="handleHealthCheck"
          />
        </n-card>

        <!-- Next Runs -->
        <n-card :title="$t('dashboard.nextRuns')" class="mt-4">
          <template #header-extra>
            <n-button text type="primary" @click="goToTasks">
              {{ $t('common.manage') }}
            </n-button>
          </template>
          
          <NextRunsList
            :runs="nextRuns"
            :loading="isLoading"
            @run-task="handleRunTask"
          />
        </n-card>

        <!-- Quick Actions -->
        <n-card :title="$t('dashboard.quickActions')" class="mt-4">
          <n-space vertical>
            <n-button type="primary" block @click="goToCreateTask">
              <template #icon>
                <n-icon>
                  <AddIcon />
                </n-icon>
              </template>
              {{ $t('tasks.createTask') }}
            </n-button>
            
            <n-button block @click="handleHealthCheck">
              <template #icon>
                <n-icon>
                  <HeartIcon />
                </n-icon>
              </template>
              {{ $t('dashboard.healthCheck') }}
            </n-button>
            
            <n-button block @click="handleCleanup">
              <template #icon>
                <n-icon>
                  <TrashIcon />
                </n-icon>
              </template>
              {{ $t('dashboard.cleanup') }}
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { useDashboardStore } from '@/stores/dashboard'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Heart as HeartIcon,
  Trash as TrashIcon,
  Download as DownloadIcon,
  Analytics as AnalyticsIcon
} from '@vicons/ionicons5'

// Import components (these will be created next)
import StatsCard from '@/components/StatsCard.vue'
import BackupTrendsChart from '@/components/BackupTrendsChart.vue'
import RecentLogsTable from '@/components/RecentLogsTable.vue'
import SystemStatus from '@/components/SystemStatus.vue'
import NextRunsList from '@/components/NextRunsList.vue'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const dashboardStore = useDashboardStore()
const appStore = useAppStore()
const { t } = useI18n()

// Reactive data
const chartPeriod = ref('30')
const chartLoading = ref(false)

// Computed properties
const isMobile = computed(() => window.innerWidth < 768)
const isLoading = computed(() => dashboardStore.isLoading)
const totalTasks = computed(() => dashboardStore.totalTasks)
const activeTasks = computed(() => dashboardStore.activeTasks)
const runningBackups = computed(() => dashboardStore.runningBackups)
const successRate = computed(() => dashboardStore.successRate)
const recentLogs = computed(() => dashboardStore.recentLogs)
const nextRuns = computed(() => dashboardStore.nextRuns)
const systemHealth = computed(() => dashboardStore.systemHealth)

const chartData = computed(() => {
  // This will be populated from the statistics store
  return dashboardStore.statistics?.daily || []
})

// Action menu options
const actionMenuOptions = computed(() => [
  {
    label: t('dashboard.exportData'),
    key: 'export',
    icon: () => h(DownloadIcon)
  },
  {
    label: t('dashboard.cleanup'),
    key: 'cleanup',
    icon: () => h(TrashIcon)
  },
  {
    label: t('nav.statistics'),
    key: 'statistics',
    icon: () => h(AnalyticsIcon)
  }
])

// Methods
const handleRefresh = async () => {
  const result = await dashboardStore.refresh()
  if (result.success) {
    message.success(t('dashboard.refreshSuccess'))
  } else {
    message.error(result.error || t('dashboard.refreshFailed'))
  }
}

const handlePeriodChange = async (period: string) => {
  chartPeriod.value = period
  chartLoading.value = true
  try {
    await dashboardStore.loadStatistics(parseInt(period))
  } finally {
    chartLoading.value = false
  }
}

const handleActionSelect = (key: string) => {
  switch (key) {
    case 'export':
      handleExport()
      break
    case 'cleanup':
      handleCleanup()
      break
    case 'statistics':
      router.push('/statistics')
      break
  }
}

const handleExport = async () => {
  const result = await dashboardStore.exportData()
  if (result.success) {
    message.success(t('dashboard.exportSuccess'))
  } else {
    message.error(result.error || t('dashboard.exportFailed'))
  }
}

const handleCleanup = () => {
  dialog.warning({
    title: t('dashboard.cleanup'),
    content: t('dashboard.cleanupConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const result = await dashboardStore.performCleanup()
      if (result.success) {
        message.success(t('dashboard.cleanupSuccess'))
      } else {
        message.error(result.error || t('dashboard.cleanupFailed'))
      }
    }
  })
}

const handleHealthCheck = async () => {
  const result = await dashboardStore.loadSystemHealth()
  if (result.success) {
    const status = dashboardStore.systemHealth?.status
    if (status === 'healthy') {
      message.success(t('dashboard.systemHealthy'))
    } else {
      message.warning(t('dashboard.systemIssues'))
    }
  } else {
    message.error(result.error || t('dashboard.healthCheckFailed'))
  }
}

const handleViewLogDetails = (logId: number) => {
  router.push(`/logs?id=${logId}`)
}

const handleRunTask = (taskId: number) => {
  // This will be implemented when we create the task management
  message.info(`Running task ${taskId}`)
}

const goToLogs = () => {
  router.push('/logs')
}

const goToTasks = () => {
  router.push('/tasks')
}

const goToCreateTask = () => {
  router.push('/tasks?action=create')
}

// Lifecycle
onMounted(async () => {
  await dashboardStore.init()
  await handlePeriodChange(chartPeriod.value)
})

onUnmounted(() => {
  dashboardStore.destroy()
})
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .dashboard-header {
  background: #2a2a2a;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
}

.header-content p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

[data-theme='dark'] .header-content p {
  color: #999;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 300px;
}

.system-card :deep(.n-card-header) {
  padding-bottom: 12px;
}

.mt-4 {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: stretch;
  }
  
  .header-actions > * {
    flex: 1;
  }
}
</style>
