<template>
  <n-modal
    v-model:show="showModal"
    :mask-closable="false"
    preset="dialog"
    :title="isEditing ? $t('tasks.editTask') : $t('tasks.createTask')"
    class="task-form-modal"
    style="width: 800px"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="top"
      require-mark-placement="right-hanging"
    >
      <!-- Basic Information -->
      <n-card :title="$t('tasks.basicInfo')" class="mb-4">
        <n-grid :cols="2" :x-gap="16">
          <n-grid-item>
            <n-form-item :label="$t('tasks.name')" path="name">
              <n-input
                v-model:value="formData.name"
                :placeholder="$t('tasks.nameRequired')"
                clearable
              />
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.type')" path="type">
              <n-select
                v-model:value="formData.type"
                :options="taskTypeOptions"
                :placeholder="$t('tasks.typeRequired')"
                @update:value="handleTypeChange"
              />
            </n-form-item>
          </n-grid-item>
        </n-grid>
        
        <n-form-item :label="$t('tasks.schedule')" path="schedule">
          <n-input
            v-model:value="formData.schedule"
            :placeholder="$t('tasks.scheduleRequired')"
            clearable
          />
          <template #feedback>
            <div class="schedule-help">
              <p>{{ $t('tasks.scheduleHelp') }}</p>
              <p>{{ $t('tasks.scheduleExamples') }}</p>
              <ul>
                <li>{{ $t('tasks.scheduleDaily') }}</li>
                <li>{{ $t('tasks.scheduleWeekly') }}</li>
                <li>{{ $t('tasks.scheduleMonthly') }}</li>
              </ul>
            </div>
          </template>
        </n-form-item>
      </n-card>

      <!-- Source Configuration -->
      <n-card :title="$t('tasks.sourceConfig')" class="mb-4">
        <component
          :is="sourceConfigComponent"
          v-model:config="formData.source_config"
          :rules="sourceConfigRules"
          :show-table-selection="formData.type === 'mysql_to_mysql'"
          :task-type="formData.type"
          prefix="source"
          @update:tables="handleTablesUpdate"
        />
      </n-card>

      <!-- Destination Configuration -->
      <n-card :title="$t('tasks.destinationConfig')" class="mb-4">
        <component
          :is="destinationConfigComponent"
          v-model:config="formData.destination_config"
          :rules="destinationConfigRules"
          :task-type="formData.type"
          prefix="destination"
        />
      </n-card>

      <!-- Sync Options -->
      <SyncOptions
        v-model:options="taskOptions"
        :task-type="formData.type"
      />
    </n-form>

    <template #action>
      <n-space>
        <n-button @click="handleCancel">
          {{ $t('common.cancel') }}
        </n-button>
        <n-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ isEditing ? $t('common.update') : $t('common.create') }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInst, FormRules } from 'naive-ui'
import type { BackupTask, CreateTaskRequest, TaskType } from '@/types'

// Import config components (will be created next)
import MySQLConfig from './config/MySQLConfig.vue'
import SMBConfig from './config/SMBConfig.vue'
import MinIOConfig from './config/MinIOConfig.vue'
import SyncOptions from './config/SyncOptions.vue'

interface Props {
  show: boolean
  task?: BackupTask | null
  loading?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'submit', data: CreateTaskRequest): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  task: null,
  loading: false
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

// Form reference
const formRef = ref<FormInst | null>(null)

// Computed properties
const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const isEditing = computed(() => props.task && props.task.id > 0)

// Form data
const formData = ref<CreateTaskRequest>({
  name: '',
  type: 'mysql_to_mysql',
  schedule: '0 2 * * *',
  source_config: {},
  destination_config: {},
  options: {}
})

// Selected tables for MySQL sync
const selectedTables = ref<string[]>([])

// Task options computed property
const taskOptions = computed({
  get: () => formData.value.options || {},
  set: (value) => {
    formData.value.options = value
  }
})

// Task type options
const taskTypeOptions = computed(() => [
  { label: t('tasks.mysqlToMysql'), value: 'mysql_to_mysql' },
  { label: t('tasks.mysqlToSmb'), value: 'mysql_to_smb' },
  { label: t('tasks.minioToMinio'), value: 'minio_to_minio' }
])

// Dynamic components based on task type
const sourceConfigComponent = computed(() => {
  switch (formData.value.type) {
    case 'mysql_to_mysql':
    case 'mysql_to_smb':
      return MySQLConfig
    case 'minio_to_minio':
      return MinIOConfig
    default:
      return MySQLConfig
  }
})

const destinationConfigComponent = computed(() => {
  switch (formData.value.type) {
    case 'mysql_to_mysql':
      return MySQLConfig
    case 'mysql_to_smb':
      return SMBConfig
    case 'minio_to_minio':
      return MinIOConfig
    default:
      return MySQLConfig
  }
})

// Form validation rules
const formRules = computed<FormRules>(() => ({
  name: [
    { required: true, message: t('tasks.nameRequired'), trigger: 'blur' }
  ],
  type: [
    { required: true, message: t('tasks.typeRequired'), trigger: 'change' }
  ],
  schedule: [
    { required: true, message: t('tasks.scheduleRequired'), trigger: 'blur' },
    {
      pattern: /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
      message: t('tasks.scheduleInvalid'),
      trigger: 'blur'
    }
  ]
}))

const sourceConfigRules = computed(() => ({}))
const destinationConfigRules = computed(() => ({}))

// Methods
const handleTypeChange = () => {
  // Reset configs when type changes
  formData.value.source_config = {}
  formData.value.destination_config = {}
  formData.value.options = {}
  selectedTables.value = []
}

const handleTablesUpdate = (...args: unknown[]) => {
  const tables = args[0] as string[]
  selectedTables.value = tables
  if (formData.value.options) {
    formData.value.options.tables = tables
  } else {
    formData.value.options = { tables }
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    emit('submit', { ...formData.value })
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

const handleCancel = () => {
  emit('cancel')
}

const resetForm = () => {
  formData.value = {
    name: '',
    type: 'mysql_to_mysql',
    schedule: '0 2 * * *',
    source_config: {},
    destination_config: {},
    options: {}
  }
  selectedTables.value = []
}

// Watch for task changes
watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      formData.value = {
        name: newTask.name,
        type: newTask.type,
        schedule: newTask.schedule,
        source_config: { ...newTask.source_config },
        destination_config: { ...newTask.destination_config },
        options: { ...newTask.options } || {}
      }
      // Set selected tables if available
      if (newTask.options?.tables) {
        selectedTables.value = [...newTask.options.tables]
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch for modal show/hide
watch(
  () => props.show,
  (show) => {
    if (!show) {
      nextTick(() => {
        formRef.value?.restoreValidation()
      })
    }
  }
)
</script>

<style scoped>
.task-form-modal :deep(.n-dialog) {
  max-height: 90vh;
  overflow-y: auto;
}

.mb-4 {
  margin-bottom: 16px;
}

.schedule-help {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.schedule-help ul {
  margin: 4px 0 0 16px;
  padding: 0;
}

.schedule-help li {
  margin: 2px 0;
}

[data-theme='dark'] .schedule-help {
  color: #999;
}
</style>
