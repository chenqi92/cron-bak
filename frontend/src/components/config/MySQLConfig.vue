<template>
  <div class="mysql-config">
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
import { Flash as TestIcon } from '@vicons/ionicons5'

interface MySQLConfig {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
}

interface Props {
  config: MySQLConfig
  prefix?: string
  rules?: any
}

interface Emits {
  (e: 'update:config', value: MySQLConfig): void
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'mysql',
  rules: () => ({})
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const message = useMessage()

// Local config state
const config = computed({
  get: () => ({
    host: props.config.host || '',
    port: props.config.port || 3306,
    username: props.config.username || '',
    password: props.config.password || '',
    database: props.config.database || '',
    ...props.config
  }),
  set: (value) => emit('update:config', value)
})

// Connection test state
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Test connection method
const testConnection = async () => {
  if (!config.value.host || !config.value.username || !config.value.password) {
    message.warning(t('tasks.fillRequiredFields'))
    return
  }
  
  testing.value = true
  testResult.value = null
  
  try {
    // Simulate connection test (in real app, this would call an API)
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
</script>

<style scoped>
.mysql-config {
  width: 100%;
}

.connection-test {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.test-result {
  margin-top: 12px;
}

/* Form item spacing */
:deep(.n-form-item) {
  margin-bottom: 0;
}

:deep(.n-form-item__feedback) {
  margin-top: 4px;
}
</style>
