<template>
  <div class="stats-card" :class="[`stats-card--${color}`, { 'stats-card--loading': loading }]">
    <div class="stats-content">
      <div class="stats-header">
        <div class="stats-icon">
          <n-icon :size="24">
            <component :is="iconComponent" />
          </n-icon>
        </div>
        <div class="stats-title">{{ title }}</div>
      </div>
      
      <div class="stats-value">
        <n-number-animation
          ref="numberAnimationRef"
          :from="0"
          :to="numericValue"
          :duration="1000"
          :precision="0"
        />
        <span v-if="suffix">{{ suffix }}</span>
      </div>
      
      <div v-if="trend" class="stats-trend" :class="`trend--${trend.direction}`">
        <n-icon :size="16">
          <component :is="trend.direction === 'up' ? ArrowUpIcon : ArrowDownIcon" />
        </n-icon>
        <span>{{ trend.value }}</span>
        <span class="trend-period">{{ $t('dashboard.thisWeek') }}</span>
      </div>
      
      <div v-if="progress !== undefined" class="stats-progress">
        <n-progress
          type="line"
          :percentage="progress"
          :height="6"
          :border-radius="3"
          :fill-border-radius="3"
          :color="progressColor"
          :rail-color="progressRailColor"
        />
      </div>
      
      <div v-if="loading" class="stats-loading">
        <n-icon :size="16" class="loading-icon">
          <LoadingIcon />
        </n-icon>
        <span>{{ $t('common.loading') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Reload as LoadingIcon,
  List as TasksIcon,
  Play as PlayIcon,
  TrendingUp as ChartIcon,
  Server as ServerIcon
} from '@vicons/ionicons5'

interface Props {
  title: string
  value: string | number
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  icon?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  progress?: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  icon: 'tasks',
  loading: false
})

const { t } = useI18n()
const numberAnimationRef = ref()

// Computed properties
const numericValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value
  }
  // Extract number from string (e.g., "94%" -> 94)
  const match = String(props.value).match(/\d+/)
  return match ? parseInt(match[0]) : 0
})

const suffix = computed(() => {
  if (typeof props.value === 'string') {
    // Extract non-numeric part (e.g., "94%" -> "%")
    return props.value.replace(/\d+/, '')
  }
  return ''
})

const iconComponent = computed(() => {
  const iconMap = {
    tasks: TasksIcon,
    play: PlayIcon,
    chart: ChartIcon,
    server: ServerIcon,
    loading: LoadingIcon
  }
  return iconMap[props.icon as keyof typeof iconMap] || TasksIcon
})

const progressColor = computed(() => {
  const colorMap = {
    primary: '#18a058',
    success: '#18a058',
    warning: '#f0a020',
    error: '#d03050',
    info: '#2080f0'
  }
  return colorMap[props.color]
})

const progressRailColor = computed(() => {
  return 'rgba(255, 255, 255, 0.3)'
})

// Watch for value changes to trigger animation
watch(() => props.value, () => {
  if (numberAnimationRef.value) {
    numberAnimationRef.value.play()
  }
})
</script>

<style scoped>
.stats-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  height: 140px;
  display: flex;
  flex-direction: column;
}

.stats-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent-color);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.stats-card:hover::before {
  opacity: 1;
}

.stats-card--primary {
  --accent-color: #18a058;
  --icon-color: #18a058;
}

.stats-card--success {
  --accent-color: #18a058;
  --icon-color: #18a058;
}

.stats-card--warning {
  --accent-color: #f0a020;
  --icon-color: #f0a020;
}

.stats-card--error {
  --accent-color: #d03050;
  --icon-color: #d03050;
}

.stats-card--info {
  --accent-color: #2080f0;
  --icon-color: #2080f0;
}

.stats-card--loading {
  opacity: 0.8;
}

.stats-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.stats-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(24, 160, 88, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--icon-color);
}

.stats-title {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: 1;
}

.stats-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: #333;
  margin-bottom: 12px;
}

.stats-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  margin-top: auto;
}

.trend--up {
  color: #18a058;
}

.trend--down {
  color: #d03050;
}

.trend-period {
  color: #999;
  font-weight: 400;
  margin-left: 4px;
}

.stats-progress {
  margin-top: auto;
}

.stats-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
  margin-top: auto;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Dark theme */
[data-theme='dark'] .stats-card {
  background: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .stats-title {
  color: #999;
}

[data-theme='dark'] .stats-value {
  color: #e0e0e0;
}

[data-theme='dark'] .trend-period {
  color: #666;
}

[data-theme='dark'] .stats-loading {
  color: #999;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-card {
    height: 120px;
    padding: 16px;
  }
  
  .stats-value {
    font-size: 24px;
  }
  
  .stats-icon {
    width: 32px;
    height: 32px;
  }
  
  .stats-header {
    margin-bottom: 12px;
  }
}
</style>
