<template>
  <div class="storages-page">
    <div class="page-header">
      <h1>{{ $t('nav.storages') }}</h1>
      <n-space>
        <n-button @click="testAllStorages" :loading="testingAll" type="info">
          <template #icon>
            <n-icon><TestIcon /></n-icon>
          </template>
          {{ $t('storages.testAll') }}
        </n-button>
        <n-button @click="refreshStorages" :loading="storageStore.isLoading">
          <template #icon>
            <n-icon><RefreshIcon /></n-icon>
          </template>
          {{ $t('common.refresh') }}
        </n-button>
        <n-button @click="showCreateModal = true" type="primary">
          <template #icon>
            <n-icon><AddIcon /></n-icon>
          </template>
          {{ $t('storages.create') }}
        </n-button>
      </n-space>
    </div>

    <!-- Storage Statistics -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="stats-grid">
      <n-grid-item>
        <n-card>
          <n-statistic label="总存储库" :value="storageStore.storageCount" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="MySQL" :value="mysqlCount" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="MinIO/S3" :value="s3Count" />
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card>
          <n-statistic label="SMB" :value="smbCount" />
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Storage List -->
    <n-card class="storage-list-card">
      <template #header>
        <div class="card-header">
          <span>存储库列表</span>
          <n-space>
            <n-select
              v-model:value="typeFilter"
              :options="typeFilterOptions"
              placeholder="按类型筛选"
              clearable
              style="width: 150px"
            />
          </n-space>
        </div>
      </template>

      <div v-if="storageStore.isLoading" class="loading">
        <n-spin size="large" />
        <p>加载中...</p>
      </div>

      <div v-else-if="filteredStorages.length === 0" class="empty">
        <n-empty description="暂无存储库">
          <template #extra>
            <n-button @click="showCreateModal = true" type="primary">创建第一个存储库</n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="storage-list">
        <div v-for="storage in filteredStorages" :key="storage.id" class="storage-item">
          <div class="storage-info">
            <div class="storage-header">
              <h3>{{ storage.name }}</h3>
              <n-tag :type="getStorageTypeColor(storage.type)">
                {{ getStorageTypeLabel(storage.type) }}
              </n-tag>
            </div>
            <div class="storage-details">
              <p><strong>配置:</strong> {{ getStorageConfigSummary(storage) }}</p>
              <p><strong>创建时间:</strong> {{ formatDate(storage.createdAt) }}</p>
              <p><strong>更新时间:</strong> {{ formatDate(storage.updatedAt) }}</p>
            </div>
            <div v-if="getTestResult(storage.id)" class="test-result">
              <n-tag 
                :type="getTestResult(storage.id)?.testResult.success ? 'success' : 'error'"
                size="small"
              >
                {{ getTestResult(storage.id)?.testResult.success ? '连接正常' : '连接失败' }}
              </n-tag>
              <span class="test-time">
                {{ formatDate(getTestResult(storage.id)?.testedAt || '') }}
              </span>
            </div>
          </div>
          <div class="storage-actions">
            <n-space>
              <n-button 
                @click="testStorage(storage.id)" 
                :loading="testingStorages.has(storage.id)"
                size="small"
                type="info"
              >
                <template #icon>
                  <n-icon><TestIcon /></n-icon>
                </template>
                测试
              </n-button>
              <n-button @click="editStorage(storage)" size="small">
                <template #icon>
                  <n-icon><EditIcon /></n-icon>
                </template>
                编辑
              </n-button>
              <n-button @click="deleteStorage(storage)" size="small" type="error">
                <template #icon>
                  <n-icon><DeleteIcon /></n-icon>
                </template>
                删除
              </n-button>
            </n-space>
          </div>
        </div>
      </div>
    </n-card>

    <!-- Create/Edit Modal -->
    <StorageModal
      v-model:show="showCreateModal"
      :storage="editingStorage"
      @success="handleModalSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useStorageStore } from '@/stores/storage'
import type { Storage } from '@/types'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Flask as TestIcon,
  Create as EditIcon,
  Trash as DeleteIcon
} from '@vicons/ionicons5'
import StorageModal from '@/components/StorageModal.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const storageStore = useStorageStore()

// Reactive data
const showCreateModal = ref(false)
const editingStorage = ref<Storage | null>(null)
const typeFilter = ref<string | null>(null)
const testingAll = ref(false)
const testingStorages = ref<Set<string>>(new Set())

// Computed
const filteredStorages = computed(() => {
  if (!typeFilter.value) {
    return storageStore.storageList
  }
  return storageStore.storageList.filter(s => s.type === typeFilter.value)
})

const mysqlCount = computed(() => storageStore.getStoragesByType('mysql').length)
const s3Count = computed(() => 
  storageStore.getStoragesByType('minio').length + storageStore.getStoragesByType('s3').length
)
const smbCount = computed(() => storageStore.getStoragesByType('smb').length)

const typeFilterOptions = computed(() => [
  { label: '全部', value: null },
  { label: 'MySQL', value: 'mysql' },
  { label: 'MinIO', value: 'minio' },
  { label: 'S3', value: 's3' },
  { label: 'SMB', value: 'smb' }
])

// Methods
const getStorageTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    mysql: 'MySQL',
    minio: 'MinIO',
    s3: 'S3',
    smb: 'SMB'
  }
  return labels[type] || type
}

const getStorageTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    mysql: 'info',
    minio: 'success',
    s3: 'warning',
    smb: 'error'
  }
  return colors[type] || 'default'
}

const getStorageConfigSummary = (storage: Storage) => {
  const config = storage.config
  switch (storage.type) {
    case 'mysql':
      return `${config.host}:${config.port}/${config.database}`
    case 'minio':
    case 's3':
      return `${config.endpoint}/${config.bucket}`
    case 'smb':
      return config.sharePath
    default:
      return 'Unknown'
  }
}

const getTestResult = (id: string) => {
  return storageStore.getTestResult(id)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

const refreshStorages = async () => {
  const result = await storageStore.refresh()
  if (result.success) {
    message.success('存储库列表已刷新')
  } else {
    message.error(result.error || '刷新失败')
  }
}

const testStorage = async (id: string) => {
  testingStorages.value.add(id)
  try {
    const result = await storageStore.testStorage(id)
    if (result.success) {
      const testResult = result.data?.testResult
      if (testResult?.success) {
        message.success('连接测试成功')
      } else {
        message.error(`连接测试失败: ${testResult?.error}`)
      }
    } else {
      message.error(result.error || '测试失败')
    }
  } finally {
    testingStorages.value.delete(id)
  }
}

const testAllStorages = async () => {
  testingAll.value = true
  try {
    const result = await storageStore.testAllStorages()
    if (result.success) {
      const successCount = result.data?.filter(r => r.testResult.success).length || 0
      const totalCount = result.data?.length || 0
      message.success(`批量测试完成: ${successCount}/${totalCount} 个存储库连接正常`)
    } else {
      message.error(result.error || '批量测试失败')
    }
  } finally {
    testingAll.value = false
  }
}

const editStorage = (storage: Storage) => {
  editingStorage.value = storage
  showCreateModal.value = true
}

const deleteStorage = (storage: Storage) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除存储库 "${storage.name}" 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const result = await storageStore.deleteStorage(storage.id)
      if (result.success) {
        message.success('存储库已删除')
      } else {
        message.error(result.error || '删除失败')
      }
    }
  })
}

const handleModalSuccess = () => {
  showCreateModal.value = false
  editingStorage.value = null
  refreshStorages()
}

// Lifecycle
onMounted(async () => {
  await storageStore.init()
})
</script>

<style scoped>
.storages-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
}

.stats-grid {
  margin-bottom: 24px;
}

.storage-list-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.storage-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.storage-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

[data-theme='dark'] .storage-item {
  background: #2a2a2a;
  border-color: #444;
}

.storage-info {
  flex: 1;
}

.storage-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.storage-header h3 {
  margin: 0;
  color: #333;
}

[data-theme='dark'] .storage-header h3 {
  color: #e0e0e0;
}

.storage-details p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

[data-theme='dark'] .storage-details p {
  color: #999;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.test-time {
  font-size: 12px;
  color: #999;
}

.storage-actions {
  margin-left: 16px;
}
</style>
