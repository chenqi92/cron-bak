<template>
  <div class="mysql-config">
    <!-- Basic Connection -->
    <n-card :title="$t('tasks.basicConnection')" class="mb-4">
      <n-grid :cols="2" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-form-item :label="$t('tasks.mysqlHost')" :path="`${prefix}_config.host`">
            <n-input
              v-model:value="config.host"
              :placeholder="$t('tasks.hostRequired')"
              clearable
            />
          </n-form-item>
        </n-grid-item>

        <n-grid-item>
          <n-form-item :label="$t('tasks.mysqlPort')" :path="`${prefix}_config.port`">
            <n-input-number
              v-model:value="config.port"
              :placeholder="3306"
              :min="1"
              :max="65535"
              style="width: 100%"
            />
          </n-form-item>
        </n-grid-item>

        <n-grid-item>
          <n-form-item :label="$t('tasks.mysqlUsername')" :path="`${prefix}_config.username`">
            <n-input
              v-model:value="config.username"
              :placeholder="$t('tasks.usernameRequired')"
              clearable
            />
          </n-form-item>
        </n-grid-item>

        <n-grid-item>
          <n-form-item :label="$t('tasks.mysqlPassword')" :path="`${prefix}_config.password`">
            <n-input
              v-model:value="config.password"
              type="password"
              :placeholder="$t('tasks.passwordRequired')"
              show-password-on="click"
              clearable
            />
          </n-form-item>
        </n-grid-item>

        <n-grid-item :span="2">
          <n-form-item :label="$t('tasks.mysqlDatabase')" :path="`${prefix}_config.database`">
            <n-input
              v-model:value="config.database"
              :placeholder="$t('tasks.databaseRequired')"
              clearable
            />
          </n-form-item>
        </n-grid-item>
      </n-grid>
    </n-card>

    <!-- Table Selection (for source MySQL) -->
    <n-card v-if="showTableSelection" :title="$t('tasks.tableSelection')" class="mb-4">
      <div class="table-selection">
        <div class="selection-header">
          <n-button
            type="primary"
            ghost
            :loading="loadingTables"
            @click="loadTables"
          >
            <template #icon>
              <n-icon>
                <RefreshIcon />
              </n-icon>
            </template>
            {{ $t('tasks.loadTables') }}
          </n-button>

          <n-space>
            <n-button @click="selectAllTables">{{ $t('tasks.selectAll') }}</n-button>
            <n-button @click="clearTableSelection">{{ $t('tasks.clearAll') }}</n-button>
          </n-space>
        </div>

        <div v-if="availableTables.length > 0" class="table-list">
          <n-checkbox-group v-model:value="selectedTables">
            <n-grid :cols="3" :x-gap="12" :y-gap="8">
              <n-grid-item v-for="table in availableTables" :key="table">
                <n-checkbox :value="table" :label="table" />
              </n-grid-item>
            </n-grid>
          </n-checkbox-group>
        </div>

        <n-empty v-else-if="!loadingTables" :description="$t('tasks.noTablesFound')" />
      </div>
    </n-card>

    <!-- Advanced Options -->
    <n-card :title="$t('tasks.advancedOptions')" class="mb-4">
      <n-collapse>
        <n-collapse-item :title="$t('tasks.sslConfiguration')" name="ssl">
          <n-grid :cols="2" :x-gap="16" :y-gap="16">
            <n-grid-item :span="2">
              <n-form-item :label="$t('tasks.enableSSL')">
                <n-switch v-model:value="sslEnabled" />
              </n-form-item>
            </n-grid-item>

            <template v-if="sslEnabled">
              <n-grid-item>
                <n-form-item :label="$t('tasks.sslCA')">
                  <n-input
                    v-model:value="config.ssl.ca"
                    type="textarea"
                    :placeholder="$t('tasks.sslCAPlaceholder')"
                    :rows="3"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item :label="$t('tasks.sslCert')">
                  <n-input
                    v-model:value="config.ssl.cert"
                    type="textarea"
                    :placeholder="$t('tasks.sslCertPlaceholder')"
                    :rows="3"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item :label="$t('tasks.sslKey')">
                  <n-input
                    v-model:value="config.ssl.key"
                    type="textarea"
                    :placeholder="$t('tasks.sslKeyPlaceholder')"
                    :rows="3"
                  />
                </n-form-item>
              </n-grid-item>

              <n-grid-item>
                <n-form-item :label="$t('tasks.sslRejectUnauthorized')">
                  <n-switch v-model:value="config.ssl.rejectUnauthorized" />
                </n-form-item>
              </n-grid-item>
            </template>
          </n-grid>
        </n-collapse-item>

        <n-collapse-item :title="$t('tasks.connectionSettings')" name="connection">
          <n-grid :cols="2" :x-gap="16" :y-gap="16">
            <n-grid-item>
              <n-form-item :label="$t('tasks.connectionLimit')">
                <n-input-number
                  v-model:value="config.connectionLimit"
                  :min="1"
                  :max="100"
                  :placeholder="10"
                  style="width: 100%"
                />
              </n-form-item>
            </n-grid-item>

            <n-grid-item>
              <n-form-item :label="$t('tasks.connectionTimeout')">
                <n-input-number
                  v-model:value="config.timeout"
                  :min="1000"
                  :max="600000"
                  :step="1000"
                  :placeholder="60000"
                  style="width: 100%"
                />
                <template #suffix>ms</template>
              </n-form-item>
            </n-grid-item>
          </n-grid>
        </n-collapse-item>
      </n-collapse>
    </n-card>
    
    <!-- Connection Test -->
    <div class="connection-test">
      <n-button
        type="primary"
        ghost
        :loading="testing"
        @click="testConnection"
      >
        <template #icon>
          <n-icon>
            <TestIcon />
          </n-icon>
        </template>
        {{ $t('tasks.testConnection') }}
      </n-button>
      
      <div v-if="testResult" class="test-result">
        <n-alert
          :type="testResult.success ? 'success' : 'error'"
          :title="testResult.success ? $t('tasks.connectionSuccess') : $t('tasks.connectionFailed')"
          :show-icon="true"
        >
          {{ testResult.message }}
        </n-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import { Flash as TestIcon, Refresh as RefreshIcon } from '@vicons/ionicons5'
import type { MySQLConfig } from '@/types'

interface Props {
  config: MySQLConfig
  prefix?: string
  rules?: any
  showTableSelection?: boolean
  taskType?: string
}

interface Emits {
  (e: 'update:config', value: MySQLConfig): void
  (e: 'update:tables', value: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'mysql',
  rules: () => ({}),
  showTableSelection: false
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const message = useMessage()

// Local config state
const config = computed({
  get: () => ({
    ...props.config,
    host: props.config.host || '',
    port: props.config.port || 3306,
    username: props.config.username || '',
    password: props.config.password || '',
    database: props.config.database || '',
    ssl: {
      ca: '',
      cert: '',
      key: '',
      rejectUnauthorized: true,
      ...props.config.ssl
    },
    connectionLimit: props.config.connectionLimit || 10,
    timeout: props.config.timeout || 60000
  }),
  set: (value) => emit('update:config', value)
})

// SSL configuration
const sslEnabled = computed({
  get: () => !!(config.value.ssl?.ca || config.value.ssl?.cert || config.value.ssl?.key),
  set: (value) => {
    if (!value) {
      config.value = {
        ...config.value,
        ssl: {
          ca: '',
          cert: '',
          key: '',
          rejectUnauthorized: true
        }
      }
    }
  }
})

// Table selection
const availableTables = ref<string[]>([])
const selectedTables = ref<string[]>([])
const loadingTables = ref(false)

// Connection test state
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Table management methods
const loadTables = async () => {
  if (!config.value.host || !config.value.username || !config.value.password || !config.value.database) {
    message.warning(t('tasks.fillConnectionFields'))
    return
  }

  loadingTables.value = true
  try {
    // TODO: Call API to get table list
    // const response = await api.getMysqlTables(config.value)

    // Mock table list for now
    await new Promise(resolve => setTimeout(resolve, 1000))
    availableTables.value = [
      'users', 'orders', 'products', 'categories', 'inventory',
      'customers', 'payments', 'shipping', 'reviews', 'settings'
    ]

    message.success(t('tasks.tablesLoaded', { count: availableTables.value.length }))
  } catch (error) {
    message.error(t('tasks.tablesLoadFailed'))
  } finally {
    loadingTables.value = false
  }
}

const selectAllTables = () => {
  selectedTables.value = [...availableTables.value]
}

const clearTableSelection = () => {
  selectedTables.value = []
}

// Test connection method
const testConnection = async () => {
  if (!config.value.host || !config.value.username || !config.value.password) {
    message.warning(t('tasks.fillRequiredFields'))
    return
  }

  testing.value = true
  testResult.value = null

  try {
    // TODO: Call API to test connection
    // const response = await api.testMysqlConnection(config.value)

    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock success/failure based on some criteria
    const success = Math.random() > 0.3 // 70% success rate for demo

    testResult.value = {
      success,
      message: success
        ? t('tasks.connectionTestSuccess')
        : t('tasks.connectionTestFailed')
    }

    if (success) {
      message.success(t('tasks.connectionSuccess'))
      // Auto-load tables if connection successful and table selection is enabled
      if (props.showTableSelection && config.value.database) {
        await loadTables()
      }
    } else {
      message.error(t('tasks.connectionFailed'))
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: t('tasks.connectionTestError')
    }
    message.error(t('tasks.connectionFailed'))
  } finally {
    testing.value = false
  }
}

// Watch for config changes and emit updates
watch(
  config,
  (newConfig) => {
    emit('update:config', newConfig)
    // Clear test result when config changes
    if (testResult.value) {
      testResult.value = null
    }
  },
  { deep: true }
)

// Watch for table selection changes
watch(
  selectedTables,
  (newTables) => {
    emit('update:tables', newTables)
  },
  { deep: true }
)
</script>

<style scoped>
.mysql-config {
  width: 100%;
}

.mb-4 {
  margin-bottom: 16px;
}

.connection-test {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.test-result {
  margin-top: 12px;
}

.table-selection {
  width: 100%;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-list {
  margin-top: 16px;
  padding: 16px;
  background: var(--card-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

/* Form item spacing */
:deep(.n-form-item) {
  margin-bottom: 0;
}

:deep(.n-form-item__feedback) {
  margin-top: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .selection-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .table-list :deep(.n-grid) {
    grid-template-columns: repeat(1, 1fr) !important;
  }
}

@media (max-width: 1024px) {
  .table-list :deep(.n-grid) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>
