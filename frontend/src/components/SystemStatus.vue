<template>
  <div class="system-status">
    <div v-if="loading" class="loading">
      <n-spin size="small" />
      <span>{{ $t('common.loading') }}</span>
    </div>
    
    <div v-else class="status-content">
      <!-- Health Status -->
      <div class="health-indicator">
        <n-tag :type="healthColor" size="large">
          <template #icon>
            <n-icon>
              <component :is="healthIcon" />
            </n-icon>
          </template>
          {{ healthText }}
        </n-tag>
      </div>

      <!-- System Metrics -->
      <div class="metrics">
        <div class="metric-item">
          <div class="metric-label">{{ $t('dashboard.uptime') }}</div>
          <div class="metric-value">{{ uptimeText }}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-label">{{ $t('dashboard.memoryUsage') }}</div>
          <div class="metric-value">{{ memoryUsage }}%</div>
          <n-progress
            type="line"
            :percentage="memoryUsage"
            :height="4"
            :show-indicator="false"
            :color="getProgressColor(memoryUsage)"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <n-button size="small" @click="handleHealthCheck">
          <template #icon>
            <n-icon>
              <RefreshIcon />
            </n-icon>
          </template>
          {{ $t('dashboard.healthCheck') }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckmarkCircle as HealthyIcon,
  Warning as DegradedIcon,
  CloseCircle as ErrorIcon,
  Refresh as RefreshIcon
} from '@vicons/ionicons5'
import { formatUptime } from '@/utils'
import type { SystemHealth } from '@/types'

interface Props {
  health: SystemHealth | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  healthCheck: []
}>()

const { t } = useI18n()

const healthColor = computed((): 'success' | 'warning' | 'error' | 'default' => {
  if (!props.health) return 'default'

  switch (props.health.status) {
    case 'healthy':
      return 'success'
    case 'degraded':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'default'
  }
})

const healthIcon = computed(() => {
  if (!props.health) return HealthyIcon
  
  switch (props.health.status) {
    case 'healthy':
      return HealthyIcon
    case 'degraded':
      return DegradedIcon
    case 'error':
      return ErrorIcon
    default:
      return HealthyIcon
  }
})

const healthText = computed(() => {
  if (!props.health) return t('dashboard.unknown')
  
  switch (props.health.status) {
    case 'healthy':
      return t('dashboard.healthy')
    case 'degraded':
      return t('dashboard.degraded')
    case 'error':
      return t('dashboard.unhealthy')
    default:
      return t('dashboard.unknown')
  }
})

const uptimeText = computed(() => {
  if (!props.health?.uptime) return '-'
  return formatUptime(props.health.uptime)
})

const memoryUsage = computed(() => {
  if (!props.health?.memory) return 0
  const { heapUsed, heapTotal } = props.health.memory
  return Math.round((heapUsed / heapTotal) * 100)
})

const getProgressColor = (percentage: number) => {
  if (percentage < 60) return '#18a058'
  if (percentage < 80) return '#f0a020'
  return '#d03050'
}

const handleHealthCheck = () => {
  emit('healthCheck')
}
</script>

<style scoped>
.system-status {
  padding: 16px 0;
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 20px;
  color: #666;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-indicator {
  text-align: center;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

[data-theme='dark'] .metric-label {
  color: #999;
}

[data-theme='dark'] .metric-value {
  color: #e0e0e0;
}

.actions {
  text-align: center;
}
</style>
