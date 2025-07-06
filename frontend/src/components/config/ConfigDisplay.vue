<template>
  <div class="config-display">
    <n-descriptions :column="1" bordered size="small">
      <template v-if="type === 'mysql'">
        <n-descriptions-item :label="$t('tasks.mysqlHost')">
          {{ config.host || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.mysqlPort')">
          {{ config.port || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.mysqlUsername')">
          {{ config.username || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.mysqlPassword')">
          <span v-if="maskSensitive">{{ maskPassword(config.password) }}</span>
          <span v-else>{{ config.password || '-' }}</span>
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.mysqlDatabase')">
          {{ config.database || '-' }}
        </n-descriptions-item>
      </template>

      <template v-else-if="type === 'smb'">
        <n-descriptions-item :label="$t('tasks.smbHost')">
          {{ config.host || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.smbPort')">
          {{ config.port || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.smbUsername')">
          {{ config.username || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.smbPassword')">
          <span v-if="maskSensitive">{{ maskPassword(config.password) }}</span>
          <span v-else>{{ config.password || '-' }}</span>
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.smbShare')">
          {{ config.share || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.smbPath')">
          {{ config.path || '-' }}
        </n-descriptions-item>
      </template>

      <template v-else-if="type === 'minio'">
        <n-descriptions-item :label="$t('tasks.minioEndpoint')">
          {{ config.endpoint || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.minioAccessKey')">
          {{ config.accessKey || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.minioSecretKey')">
          <span v-if="maskSensitive">{{ maskPassword(config.secretKey) }}</span>
          <span v-else>{{ config.secretKey || '-' }}</span>
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.minioBucket')">
          {{ config.bucket || '-' }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.minioRegion')">
          {{ config.region || '-' }}
        </n-descriptions-item>
        <n-descriptions-item v-if="config.prefix" :label="$t('tasks.minioPrefix')">
          {{ config.prefix }}
        </n-descriptions-item>
        <n-descriptions-item :label="$t('tasks.minioSSL')">
          <n-tag :type="config.useSSL ? 'success' : 'default'" size="small">
            {{ config.useSSL ? $t('common.enabled') : $t('common.disabled') }}
          </n-tag>
        </n-descriptions-item>
      </template>

      <template v-else>
        <!-- Generic config display -->
        <n-descriptions-item
          v-for="(value, key) in config"
          :key="key"
          :label="String(key)"
        >
          <span v-if="maskSensitive && isSensitiveField(key)">
            {{ maskPassword(String(value)) }}
          </span>
          <span v-else>
            {{ formatValue(value) }}
          </span>
        </n-descriptions-item>
      </template>
    </n-descriptions>

    <!-- Toggle sensitive data visibility -->
    <div v-if="hasSensitiveData" class="sensitive-toggle">
      <n-button
        text
        type="primary"
        size="small"
        @click="toggleSensitiveVisibility"
      >
        <template #icon>
          <n-icon>
            <component :is="maskSensitive ? EyeIcon : EyeOffIcon" />
          </n-icon>
        </template>
        {{ maskSensitive ? $t('tasks.showSensitive') : $t('tasks.hideSensitive') }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from '@vicons/ionicons5'

interface Props {
  config: Record<string, any>
  type: 'mysql' | 'smb' | 'minio' | 'generic'
  maskSensitive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maskSensitive: true
})

const { t } = useI18n()

// Local state for toggling sensitive data visibility
const maskSensitive = ref(props.maskSensitive)

// Computed properties
const hasSensitiveData = computed(() => {
  const sensitiveFields = ['password', 'secretKey', 'secret', 'token', 'key']
  return Object.keys(props.config).some(key => 
    sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
  )
})

// Methods
const maskPassword = (password: string | undefined) => {
  if (!password) return '-'
  if (password.length <= 4) return '****'
  return password.substring(0, 2) + '*'.repeat(password.length - 4) + password.substring(password.length - 2)
}

const isSensitiveField = (key: string) => {
  const sensitiveFields = ['password', 'secretkey', 'secret', 'token', 'key']
  return sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))
}

const formatValue = (value: any) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const toggleSensitiveVisibility = () => {
  maskSensitive.value = !maskSensitive.value
}
</script>

<style scoped>
.config-display {
  width: 100%;
}

.sensitive-toggle {
  margin-top: 12px;
  text-align: right;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  :deep(.n-descriptions) {
    font-size: 12px;
  }
  
  :deep(.n-descriptions-item__label) {
    min-width: 80px;
  }
}
</style>
