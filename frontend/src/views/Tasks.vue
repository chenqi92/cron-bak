<template>
  <div class="tasks-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>{{ $t('tasks.title') }}</h1>
        <p>{{ $t('tasks.subtitle', { total: totalTasks }) }}</p>
      </div>
      <div class="header-actions">
        <n-button
          type="primary"
          @click="showCreateModal = true"
          :loading="isCreating"
        >
          <template #icon>
            <n-icon>
              <AddIcon />
            </n-icon>
          </template>
          {{ $t('tasks.createTask') }}
        </n-button>
      </div>
    </div>

    <!-- Filters and Search -->
    <n-card class="filter-card">
      <n-space>
        <n-input
          v-model:value="searchKeyword"
          :placeholder="$t('tasks.searchPlaceholder')"
          clearable
          style="width: 300px"
          @input="handleSearch"
        >
          <template #prefix>
            <n-icon>
              <SearchIcon />
            </n-icon>
          </template>
        </n-input>

        <n-select
          v-model:value="filterType"
          :placeholder="$t('tasks.filterByType')"
          :options="typeOptions"
          clearable
          style="width: 200px"
          @update:value="handleFilterChange"
        />

        <n-select
          v-model:value="filterActive"
          :placeholder="$t('tasks.filterByStatus')"
          :options="statusOptions"
          clearable
          style="width: 150px"
          @update:value="handleFilterChange"
        />

        <n-button
          @click="handleRefresh"
          :loading="isLoading"
        >
          <template #icon>
            <n-icon>
              <RefreshIcon />
            </n-icon>
          </template>
          {{ $t('common.refresh') }}
        </n-button>
      </n-space>
    </n-card>

    <!-- Tasks Table -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="tasks"
        :loading="isLoading"
        :pagination="paginationConfig"
        :row-key="(row: BackupTask) => row.id"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <!-- Create/Edit Task Modal -->
    <TaskFormModal
      v-model:show="showCreateModal"
      :task="editingTask"
      :loading="isCreating || isUpdating"
      @submit="handleTaskSubmit"
      @cancel="handleModalCancel"
    />

    <!-- Task Details Modal -->
    <TaskDetailsModal
      v-model:show="showDetailsModal"
      :task="selectedTask"
      :loading="false"
      @edit="handleEditTask"
      @run="handleRunTask"
      @toggle="handleToggleTask"
      @delete="handleDeleteTask"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useTasksStore } from '@/stores/tasks'
import { showToast } from '@/utils/toast'
import type { BackupTask, CreateTaskRequest, TaskType } from '@/types'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
  Trash as TrashIcon,
  Eye as EyeIcon,
  Copy as CopyIcon
} from '@vicons/ionicons5'

// Import components (will be created next)
import TaskFormModal from '@/components/TaskFormModal.vue'
import TaskDetailsModal from '@/components/TaskDetailsModal.vue'

const message = useMessage()
const dialog = useDialog()
const { t } = useI18n()
const tasksStore = useTasksStore()

// Reactive data
const showCreateModal = ref(false)
const showDetailsModal = ref(false)
const editingTask = ref<BackupTask | null>(null)
const selectedTask = ref<BackupTask | null>(null)
const searchKeyword = ref('')
const filterType = ref<TaskType | null>(null)
const filterActive = ref<boolean | null>(null)

// Computed properties
const isLoading = computed(() => tasksStore.isLoading)
const isCreating = computed(() => tasksStore.isCreating)
const isUpdating = computed(() => tasksStore.isUpdating)
const tasks = computed(() => tasksStore.tasks)
const totalTasks = computed(() => tasksStore.totalTasks)
const pagination = computed(() => tasksStore.pagination)

// Filter options
const typeOptions = computed(() => [
  { label: t('tasks.allTypes'), value: null },
  { label: t('tasks.mysqlToMysql'), value: 'mysql_to_mysql' },
  { label: t('tasks.mysqlToSmb'), value: 'mysql_to_smb' },
  { label: t('tasks.minioToMinio'), value: 'minio_to_minio' }
])

const statusOptions = computed(() => [
  { label: t('tasks.allStatuses'), value: null },
  { label: t('tasks.active'), value: true },
  { label: t('tasks.inactive'), value: false }
])

// Pagination config
const paginationConfig = computed(() => ({
  page: pagination.value.page,
  pageSize: pagination.value.pageSize,
  itemCount: pagination.value.total,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  showQuickJumper: true,
  prefix: ({ itemCount }: { itemCount: number }) => t('pagination.total', { total: itemCount })
}))

// Table columns
const columns = computed<DataTableColumns<BackupTask>>(() => [
  {
    title: t('tasks.taskName'),
    key: 'name',
    ellipsis: {
      tooltip: true
    },
    render: (row) => h('span', { class: 'font-medium' }, row.name)
  },
  {
    title: t('tasks.taskType'),
    key: 'type',
    width: 150,
    render: (row) => {
      const typeMap = {
        'mysql_to_mysql': t('tasks.mysqlToMysql'),
        'mysql_to_smb': t('tasks.mysqlToSmb'),
        'minio_to_minio': t('tasks.minioToMinio')
      }
      return h('span', typeMap[row.type] || row.type)
    }
  },
  {
    title: t('tasks.taskStatus'),
    key: 'is_active',
    width: 120,
    render: (row) => {
      const isActive = row.is_active
      return h(
        'n-tag',
        {
          type: isActive ? 'success' : 'default',
          size: 'small'
        },
        isActive ? t('tasks.active') : t('tasks.inactive')
      )
    }
  },
  {
    title: t('tasks.lastRun'),
    key: 'last_run',
    width: 180,
    render: (row) => {
      if (!row.last_run) return h('span', { class: 'text-gray-400' }, t('common.never'))
      return h('span', new Date(row.last_run).toLocaleString())
    }
  },
  {
    title: t('tasks.nextRun'),
    key: 'next_run',
    width: 180,
    render: (row) => {
      if (!row.next_run) return h('span', { class: 'text-gray-400' }, '-')
      return h('span', new Date(row.next_run).toLocaleString())
    }
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 200,
    render: (row) => {
      return h('n-space', { size: 'small' }, [
        h(
          'n-button',
          {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => handleViewDetails(row)
          },
          { icon: () => h(EyeIcon), default: () => t('tasks.viewDetails') }
        ),
        h(
          'n-button',
          {
            size: 'small',
            type: row.is_active ? 'success' : 'default',
            ghost: true,
            disabled: !row.is_active,
            onClick: () => handleRunTask(row.id)
          },
          { icon: () => h(PlayIcon), default: () => t('tasks.runNow') }
        ),
        h(
          'n-dropdown',
          {
            trigger: 'click',
            options: getActionOptions(row),
            onSelect: (key: string) => handleActionSelect(key, row)
          },
          {
            default: () => h(
              'n-button',
              { size: 'small', quaternary: true },
              { icon: () => h(SettingsIcon) }
            )
          }
        )
      ])
    }
  }
])

// Action dropdown options
const getActionOptions = (task: BackupTask) => [
  {
    label: t('tasks.editTask'),
    key: 'edit',
    icon: () => h(SettingsIcon)
  },
  {
    label: task.is_active ? t('tasks.disable') : t('tasks.enable'),
    key: 'toggle',
    icon: () => h(task.is_active ? PauseIcon : PlayIcon)
  },
  {
    label: t('tasks.duplicate'),
    key: 'duplicate',
    icon: () => h(CopyIcon)
  },
  {
    type: 'divider'
  },
  {
    label: t('tasks.deleteTask'),
    key: 'delete',
    icon: () => h(TrashIcon),
    props: {
      style: 'color: #e74c3c'
    }
  }
]

// Methods
const handleSearch = () => {
  applyFilters()
}

const handleFilterChange = () => {
  applyFilters()
}

const applyFilters = () => {
  const filters = {
    keyword: searchKeyword.value,
    type: filterType.value,
    active: filterActive.value,
    page: 1,
    pageSize: pagination.value.pageSize
  }

  tasksStore.setFilter(filters)
  tasksStore.setPagination({ page: 1 })
  loadTasks()
}

const handleRefresh = async () => {
  const result = await tasksStore.refresh()
  if (result.success) {
    showToast.success(t('common.refreshSuccess'))
  } else {
    showToast.error(result.error || t('common.refreshFailed'))
  }
}

const handlePageChange = (page: number) => {
  tasksStore.setPagination({ page })
  loadTasks()
}

const handlePageSizeChange = (pageSize: number) => {
  tasksStore.setPagination({ page: 1, pageSize })
  loadTasks()
}

const loadTasks = async () => {
  const filters = {
    ...tasksStore.filter,
    ...tasksStore.pagination
  }
  await tasksStore.loadTasks(filters)
}

const handleViewDetails = (task: BackupTask) => {
  selectedTask.value = task
  showDetailsModal.value = true
}

const handleEditTask = (task: BackupTask) => {
  editingTask.value = task
  showCreateModal.value = true
  showDetailsModal.value = false
}

const handleRunTask = async (taskId: number) => {
  const result = await tasksStore.runTask(taskId)
  if (result.success) {
    showToast.success(t('tasks.runSuccess'))
  } else {
    showToast.error(result.error || t('tasks.runFailed'))
  }
}

const handleToggleTask = async (taskId: number) => {
  const result = await tasksStore.toggleTask(taskId)
  if (result.success) {
    showToast.success(t('tasks.toggleSuccess'))
  } else {
    showToast.error(result.error || t('tasks.toggleFailed'))
  }
}

const handleDeleteTask = (task: BackupTask) => {
  dialog.warning({
    title: t('tasks.deleteTask'),
    content: t('tasks.deleteConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      const result = await tasksStore.deleteTask(task.id)
      if (result.success) {
        showToast.success(t('tasks.deleteSuccess'))
        showDetailsModal.value = false
      } else {
        showToast.error(result.error || t('tasks.deleteFailed'))
      }
    }
  })
}

const handleActionSelect = (key: string, task: BackupTask) => {
  switch (key) {
    case 'edit':
      handleEditTask(task)
      break
    case 'toggle':
      handleToggleTask(task.id)
      break
    case 'duplicate':
      handleDuplicateTask(task)
      break
    case 'delete':
      handleDeleteTask(task)
      break
  }
}

const handleDuplicateTask = (task: BackupTask) => {
  editingTask.value = {
    ...task,
    id: 0, // Reset ID for new task
    name: `${task.name} (副本)`,
    created_at: '',
    updated_at: '',
    last_run: undefined,
    next_run: undefined
  } as BackupTask
  showCreateModal.value = true
}

const handleTaskSubmit = async (taskData: CreateTaskRequest) => {
  let result

  if (editingTask.value && editingTask.value.id > 0) {
    // Update existing task
    result = await tasksStore.updateTask(editingTask.value.id, taskData)
    if (result.success) {
      showToast.success(t('tasks.updateSuccess'))
    } else {
      showToast.error(result.error || t('tasks.updateFailed'))
    }
  } else {
    // Create new task
    result = await tasksStore.createTask(taskData)
    if (result.success) {
      showToast.success(t('tasks.createSuccess'))
    } else {
      showToast.error(result.error || t('tasks.createFailed'))
    }
  }

  if (result.success) {
    showCreateModal.value = false
    editingTask.value = null
  }
}

const handleModalCancel = () => {
  showCreateModal.value = false
  editingTask.value = null
}

// Lifecycle
onMounted(async () => {
  await loadTasks()
})
</script>

<style scoped>
.tasks-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .page-header {
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

.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.n-card__content) {
  padding: 16px 24px;
}

.font-medium {
  font-weight: 500;
}

.text-gray-400 {
  color: #9ca3af;
}

[data-theme='dark'] .text-gray-400 {
  color: #6b7280;
}

/* Responsive design */
@media (max-width: 768px) {
  .tasks-page {
    padding: 0 8px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    padding: 16px;
  }

  .header-actions {
    justify-content: stretch;
  }

  .header-actions > * {
    flex: 1;
  }

  .filter-card :deep(.n-space) {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-card :deep(.n-space > *) {
    width: 100% !important;
  }
}

/* Table responsive */
@media (max-width: 1024px) {
  :deep(.n-data-table) {
    font-size: 14px;
  }

  :deep(.n-data-table .n-data-table-th),
  :deep(.n-data-table .n-data-table-td) {
    padding: 8px 12px;
  }
}
</style>
