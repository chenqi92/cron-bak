<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="$t('tasks.taskDetails')"
    class="task-details-modal"
    style="width: 900px"
  >
    <div v-if="task" class="task-details">
      <!-- Header with actions -->
      <div class="details-header">
        <div class="task-info">
          <h2>{{ task.name }}</h2>
          <n-tag
            :type="task.is_active ? 'success' : 'default'"
            size="large"
          >
            {{ task.is_active ? $t('tasks.active') : $t('tasks.inactive') }}
          </n-tag>
        </div>
        
        <n-space>
          <n-button
            type="primary"
            @click="$emit('edit', task)"
          >
            <template #icon>
              <n-icon>
                <EditIcon />
              </n-icon>
            </template>
            {{ $t('tasks.editTask') }}
          </n-button>
          
          <n-button
            type="success"
            :disabled="!task.is_active"
            @click="$emit('run', task.id)"
          >
            <template #icon>
              <n-icon>
                <PlayIcon />
              </n-icon>
            </template>
            {{ $t('tasks.runNow') }}
          </n-button>
          
          <n-button
            :type="task.is_active ? 'warning' : 'success'"
            @click="$emit('toggle', task.id)"
          >
            <template #icon>
              <n-icon>
                <component :is="task.is_active ? PauseIcon : PlayIcon" />
              </n-icon>
            </template>
            {{ task.is_active ? $t('tasks.disable') : $t('tasks.enable') }}
          </n-button>
          
          <n-button
            type="error"
            @click="$emit('delete', task)"
          >
            <template #icon>
              <n-icon>
                <TrashIcon />
              </n-icon>
            </template>
            {{ $t('tasks.deleteTask') }}
          </n-button>
        </n-space>
      </div>

      <!-- Basic Information -->
      <n-card :title="$t('tasks.basicInfo')" class="mb-4">
        <n-descriptions :column="2" bordered>
          <n-descriptions-item :label="$t('tasks.taskName')">
            {{ task.name }}
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('tasks.taskType')">
            {{ getTaskTypeLabel(task.type) }}
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('tasks.taskSchedule')">
            <n-code>{{ task.schedule }}</n-code>
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('tasks.taskStatus')">
            <n-tag :type="task.is_active ? 'success' : 'default'">
              {{ task.is_active ? $t('tasks.active') : $t('tasks.inactive') }}
            </n-tag>
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('tasks.lastRun')">
            {{ task.last_run ? formatDateTime(task.last_run) : $t('common.never') }}
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('tasks.nextRun')">
            {{ task.next_run ? formatDateTime(task.next_run) : '-' }}
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('common.createdAt')">
            {{ formatDateTime(task.created_at) }}
          </n-descriptions-item>
          
          <n-descriptions-item :label="$t('common.updatedAt')">
            {{ formatDateTime(task.updated_at) }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <!-- Configuration Details -->
      <n-grid :cols="2" :x-gap="16">
        <!-- Source Configuration -->
        <n-grid-item>
          <n-card :title="$t('tasks.sourceConfig')">
            <ConfigDisplay
              :config="task.source_config"
              :type="getSourceConfigType(task.type)"
              :mask-sensitive="true"
            />
          </n-card>
        </n-grid-item>

        <!-- Destination Configuration -->
        <n-grid-item>
          <n-card :title="$t('tasks.destinationConfig')">
            <ConfigDisplay
              :config="task.destination_config"
              :type="getDestinationConfigType(task.type)"
              :mask-sensitive="true"
            />
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>

    <div v-else class="loading-state">
      <n-spin size="large" />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BackupTask } from '@/types'
import {
  Create as EditIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Trash as TrashIcon
} from '@vicons/ionicons5'

// Import config display component (will be created next)
import ConfigDisplay from './config/ConfigDisplay.vue'

interface Props {
  show: boolean
  task?: BackupTask | null
  loading?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'edit', task: BackupTask): void
  (e: 'run', taskId: number): void
  (e: 'toggle', taskId: number): void
  (e: 'delete', task: BackupTask): void
}

const props = withDefaults(defineProps<Props>(), {
  task: null,
  loading: false
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

// Computed properties
const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// Helper methods
const getTaskTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'mysql_to_mysql': t('tasks.mysqlToMysql'),
    'mysql_to_smb': t('tasks.mysqlToSmb'),
    'minio_to_minio': t('tasks.minioToMinio')
  }
  return typeMap[type] || type
}

const getSourceConfigType = (taskType: string) => {
  switch (taskType) {
    case 'mysql_to_mysql':
    case 'mysql_to_smb':
      return 'mysql'
    case 'minio_to_minio':
      return 'minio'
    default:
      return 'mysql'
  }
}

const getDestinationConfigType = (taskType: string) => {
  switch (taskType) {
    case 'mysql_to_mysql':
      return 'mysql'
    case 'mysql_to_smb':
      return 'smb'
    case 'minio_to_minio':
      return 'minio'
    default:
      return 'mysql'
  }
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}
</script>

<style scoped>
.task-details-modal :deep(.n-card) {
  max-height: 80vh;
  overflow-y: auto;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.task-info h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.mb-4 {
  margin-bottom: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

/* Responsive design */
@media (max-width: 768px) {
  .details-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .details-header .n-space {
    justify-content: stretch;
  }
  
  .details-header .n-space > * {
    flex: 1;
  }
}
</style>
