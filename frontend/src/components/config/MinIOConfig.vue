<template>
  <div class="minio-config">
    <n-grid :cols="2" :x-gap="16" :y-gap="16">
      <n-grid-item>
        <n-form-item :label="$t('tasks.minioEndpoint')" :path="`${prefix}_config.endPoint`">
          <n-input
            v-model:value="config.endPoint"
            :placeholder="$t('tasks.endpointRequired')"
            clearable
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="$t('tasks.minioPort')" :path="`${prefix}_config.port`">
          <n-input-number
            v-model:value="config.port"
            :placeholder="9000"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </n-form-item>
      </n-grid-item>
      
      <n-grid-item>
        <n-form-item :label="$t('tasks.minioAccessKey')" :path="`${prefix}_config.accessKey`">
          <n-input
            v-model:value="config.accessKey"
            :placeholder="$t('tasks.accessKeyRequired')"
            clearable
          />
        </n-form-item>
      </n-grid-item>
      
      <n-grid-item>
        <n-form-item :label="$t('tasks.minioSecretKey')" :path="`${prefix}_config.secretKey`">
          <n-input
            v-model:value="config.secretKey"
            type="password"
            :placeholder="$t('tasks.secretKeyRequired')"
            show-password-on="click"
            clearable
          />
        </n-form-item>
      </n-grid-item>
      
      <n-grid-item>
        <n-form-item :label="$t('tasks.minioBucket')" :path="`${prefix}_config.bucket`">
          <n-input
            v-model:value="config.bucket"
            :placeholder="$t('tasks.bucketRequired')"
            clearable
          />
        </n-form-item>
      </n-grid-item>
      
      <n-grid-item>
        <n-form-item :label="$t('tasks.minioRegion')" :path="`${prefix}_config.region`">
          <n-input
            v-model:value="config.region"
            placeholder="us-east-1"
            clearable
          />
        </n-form-item>
      </n-grid-item>
      

      
      <n-grid-item :span="2">
        <n-form-item :label="$t('tasks.minioSSL')">
          <n-switch
            v-model:value="config.useSSL"
            :checked-value="true"
            :unchecked-value="false"
          >
            <template #checked>
              {{ $t('common.enabled') }}
            </template>
            <template #unchecked>
              {{ $t('common.disabled') }}
            </template>
          </n-switch>
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

interface MinIOConfig {
  endPoint?: string
  port?: number
  accessKey?: string
  secretKey?: string
  bucket?: string
  region?: string
  useSSL?: boolean
}

interface Props {
  config: MinIOConfig
  prefix?: string
  rules?: any
}

interface Emits {
  (e: 'update:config', value: MinIOConfig): void
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'minio',
  rules: () => ({})
})

const emit = defineEmits<Emits>()
const { t } = useI18n()
const message = useMessage()

// Local config state
const config = computed({
  get: () => ({
    endPoint: props.config.endPoint || '',
    port: props.config.port || 9000,
    accessKey: props.config.accessKey || '',
    secretKey: props.config.secretKey || '',
    bucket: props.config.bucket || '',
    region: props.config.region || 'us-east-1',
    useSSL: props.config.useSSL !== undefined ? props.config.useSSL : true,
    ...props.config
  }),
  set: (value) => emit('update:config', value)
})

// Connection test state
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Test connection method
const testConnection = async () => {
  if (!config.value.endPoint || !config.value.accessKey || !config.value.secretKey || !config.value.bucket) {
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
.minio-config {
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

.text-gray-500 {
  color: #6b7280;
}

[data-theme='dark'] .text-gray-500 {
  color: #9ca3af;
}

/* Form item spacing */
:deep(.n-form-item) {
  margin-bottom: 0;
}

:deep(.n-form-item__feedback) {
  margin-top: 4px;
}
</style>
