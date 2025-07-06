<template>
  <div class="next-runs">
    <div v-if="loading" class="loading">
      <n-spin size="small" />
      <span>{{ $t('common.loading') }}</span>
    </div>
    
    <div v-else-if="!runs || runs.length === 0" class="empty">
      <n-empty size="small" :description="$t('dashboard.noScheduledRuns')" />
    </div>
    
    <div v-else class="runs-list">
      <div
        v-for="run in runs.slice(0, 5)"
        :key="run.id"
        class="run-item"
      >
        <div class="run-info">
          <div class="run-name">{{ run.name }}</div>
          <div class="run-type">{{ getTaskTypeLabel(run.type) }}</div>
          <div class="run-time">
            <n-icon size="14">
              <TimeIcon />
            </n-icon>
            {{ formatRelativeTime(run.next_run) }}
          </div>
        </div>
        
        <div class="run-actions">
          <n-button
            size="tiny"
            quaternary
            type="primary"
            @click="handleRunTask(run.id)"
          >
            <template #icon>
              <n-icon>
                <PlayIcon />
              </n-icon>
            </template>
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  Time as TimeIcon,
  Play as PlayIcon
} from '@vicons/ionicons5'
import { formatRelativeTime, getTaskTypeLabel } from '@/utils'

interface NextRun {
  id: number
  name: string
  type: string
  next_run: string
}

interface Props {
  runs: NextRun[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  runTask: [id: number]
}>()

const { t } = useI18n()

const handleRunTask = (id: number) => {
  emit('runTask', id)
}
</script>

<style scoped>
.next-runs {
  padding: 16px 0;
}

.loading,
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
  gap: 8px;
}

.runs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.run-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.run-item:hover {
  background: #e9ecef;
  transform: translateX(2px);
}

[data-theme='dark'] .run-item {
  background: #3a3a3a;
}

[data-theme='dark'] .run-item:hover {
  background: #4a4a4a;
}

.run-info {
  flex: 1;
  min-width: 0;
}

.run-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run-type {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.run-time {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

[data-theme='dark'] .run-name {
  color: #e0e0e0;
}

[data-theme='dark'] .run-type {
  color: #999;
}

[data-theme='dark'] .run-time {
  color: #666;
}

.run-actions {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
