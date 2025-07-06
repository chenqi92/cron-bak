<template>
  <div class="recent-logs">
    <n-data-table
      :columns="columns"
      :data="logs"
      :loading="loading"
      :pagination="false"
      :max-height="300"
      size="small"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTag, NButton, NIcon } from 'naive-ui'
import { Eye as EyeIcon } from '@vicons/ionicons5'
import { formatRelativeTime, getStatusColor } from '@/utils'
import type { BackupLog } from '@/types'

interface Props {
  logs: BackupLog[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  viewDetails: [id: number]
}>()

const { t } = useI18n()

const columns = computed(() => [
  {
    title: t('logs.taskName'),
    key: 'task_name',
    width: 200,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: t('logs.status'),
    key: 'status',
    width: 100,
    render: (row: BackupLog) => {
      return h(NTag, {
        type: getStatusColor(row.status) as 'success' | 'error' | 'default' | 'info' | 'warning' | 'primary',
        size: 'small'
      }, {
        default: () => row.status
      })
    }
  },
  {
    title: t('logs.startedAt'),
    key: 'started_at',
    width: 120,
    render: (row: BackupLog) => {
      return formatRelativeTime(row.started_at)
    }
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 80,
    render: (row: BackupLog) => {
      return h(NButton, {
        size: 'small',
        quaternary: true,
        onClick: () => emit('viewDetails', row.id)
      }, {
        default: () => h(NIcon, null, {
          default: () => h(EyeIcon)
        })
      })
    }
  }
])
</script>

<style scoped>
.recent-logs {
  width: 100%;
}
</style>
