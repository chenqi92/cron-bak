<template>
  <div class="sync-options">
    <!-- MySQL Sync Options -->
    <template v-if="taskType === 'mysql_to_mysql'">
      <n-card :title="$t('tasks.syncOptions')" class="mb-4">
        <n-grid :cols="2" :x-gap="16" :y-gap="16">
          <n-grid-item>
            <n-form-item :label="$t('tasks.syncMode')">
              <n-select
                v-model:value="options.syncMode"
                :options="syncModeOptions"
                :placeholder="$t('tasks.selectSyncMode')"
              />
              <template #feedback>
                <div class="option-help">
                  <p v-if="options.syncMode === 'force'">{{ $t('tasks.forceModeHelp') }}</p>
                  <p v-if="options.syncMode === 'merge'">{{ $t('tasks.mergeModeHelp') }}</p>
                </div>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.batchSize')">
              <n-input-number
                v-model:value="options.batchSize"
                :min="100"
                :max="10000"
                :step="100"
                :placeholder="1000"
                style="width: 100%"
              />
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.batchSizeHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.dropTables')">
              <n-switch v-model:value="options.dropTables">
                <template #checked>{{ $t('common.enabled') }}</template>
                <template #unchecked>{{ $t('common.disabled') }}</template>
              </n-switch>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.dropTablesHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.truncateTables')">
              <n-switch v-model:value="options.truncateTables">
                <template #checked>{{ $t('common.enabled') }}</template>
                <template #unchecked>{{ $t('common.disabled') }}</template>
              </n-switch>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.truncateTablesHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.continueOnError')">
              <n-switch v-model:value="options.continueOnError">
                <template #checked>{{ $t('common.enabled') }}</template>
                <template #unchecked>{{ $t('common.disabled') }}</template>
              </n-switch>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.continueOnErrorHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
        </n-grid>
      </n-card>
    </template>

    <!-- S3 Sync Options -->
    <template v-else-if="taskType === 'minio_to_minio' || taskType === 'minio_to_smb'">
      <n-card :title="$t('tasks.syncOptions')" class="mb-4">
        <n-grid :cols="2" :x-gap="16" :y-gap="16">
          <n-grid-item>
            <n-form-item :label="$t('tasks.objectPrefix')">
              <n-input
                v-model:value="options.prefix"
                :placeholder="$t('tasks.objectPrefixPlaceholder')"
                clearable
              />
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.objectPrefixHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.delayMs')">
              <n-input-number
                v-model:value="options.delayMs"
                :min="0"
                :max="10000"
                :step="100"
                :placeholder="0"
                style="width: 100%"
              />
              <template #suffix>ms</template>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.delayMsHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.forceOverwrite')">
              <n-switch v-model:value="options.forceOverwrite">
                <template #checked>{{ $t('common.enabled') }}</template>
                <template #unchecked>{{ $t('common.disabled') }}</template>
              </n-switch>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.forceOverwriteHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.deleteExtraFiles')">
              <n-switch v-model:value="options.deleteExtraFiles">
                <template #checked>{{ $t('common.enabled') }}</template>
                <template #unchecked>{{ $t('common.disabled') }}</template>
              </n-switch>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.deleteExtraFilesHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
          
          <n-grid-item>
            <n-form-item :label="$t('tasks.verboseLogging')">
              <n-switch v-model:value="options.verbose">
                <template #checked>{{ $t('common.enabled') }}</template>
                <template #unchecked>{{ $t('common.disabled') }}</template>
              </n-switch>
              <template #feedback>
                <span class="text-gray-500">{{ $t('tasks.verboseLoggingHelp') }}</span>
              </template>
            </n-form-item>
          </n-grid-item>
        </n-grid>
      </n-card>
    </template>

    <!-- General Options -->
    <n-card :title="$t('tasks.generalOptions')" class="mb-4">
      <n-grid :cols="2" :x-gap="16" :y-gap="16">
        <n-grid-item>
          <n-form-item :label="$t('tasks.retryCount')">
            <n-input-number
              v-model:value="options.retryCount"
              :min="0"
              :max="10"
              :placeholder="3"
              style="width: 100%"
            />
            <template #feedback>
              <span class="text-gray-500">{{ $t('tasks.retryCountHelp') }}</span>
            </template>
          </n-form-item>
        </n-grid-item>
        
        <n-grid-item>
          <n-form-item :label="$t('tasks.retryDelay')">
            <n-input-number
              v-model:value="options.retryDelay"
              :min="1000"
              :max="300000"
              :step="1000"
              :placeholder="5000"
              style="width: 100%"
            />
            <template #suffix>ms</template>
            <template #feedback>
              <span class="text-gray-500">{{ $t('tasks.retryDelayHelp') }}</span>
            </template>
          </n-form-item>
        </n-grid-item>
        
        <n-grid-item>
          <n-form-item :label="$t('tasks.taskTimeout')">
            <n-input-number
              v-model:value="options.timeout"
              :min="60000"
              :max="86400000"
              :step="60000"
              :placeholder="3600000"
              style="width: 100%"
            />
            <template #suffix>ms</template>
            <template #feedback>
              <span class="text-gray-500">{{ $t('tasks.taskTimeoutHelp') }}</span>
            </template>
          </n-form-item>
        </n-grid-item>
      </n-grid>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskOptions } from '@/types'

interface Props {
  options: TaskOptions
  taskType: string
}

interface Emits {
  (e: 'update:options', value: TaskOptions): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

// Computed options with defaults
const options = computed({
  get: () => ({
    // MySQL sync defaults
    syncMode: 'merge' as 'force' | 'merge',
    batchSize: 1000,
    dropTables: false,
    truncateTables: false,
    continueOnError: true,

    // S3 sync defaults
    prefix: '',
    forceOverwrite: false,
    deleteExtraFiles: false,
    delayMs: 0,
    verbose: false,

    // General defaults
    retryCount: 3,
    retryDelay: 5000,
    timeout: 3600000,

    // Override with actual values
    ...props.options
  }),
  set: (value) => emit('update:options', value)
})

// Sync mode options
const syncModeOptions = computed(() => [
  {
    label: t('tasks.forceMode'),
    value: 'force'
  },
  {
    label: t('tasks.mergeMode'),
    value: 'merge'
  }
])
</script>

<style scoped>
.sync-options {
  width: 100%;
}

.mb-4 {
  margin-bottom: 16px;
}

.option-help {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.text-gray-500 {
  color: #6b7280;
  font-size: 12px;
}

[data-theme='dark'] .option-help {
  color: #999;
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
