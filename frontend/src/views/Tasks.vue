<template>
  <div class="tasks-page">
    <div class="page-header">
      <h1>{{ $t('nav.tasks') }}</h1>
      <n-button type="primary" @click="handleCreateTask">
        <template #icon>
          <n-icon>
            <AddIcon />
          </n-icon>
        </template>
        {{ $t('tasks.createTask') }}
      </n-button>
    </div>
    
    <n-card>
      <div class="coming-soon">
        <n-empty size="large" description="Tasks management coming soon..." />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { Add as AddIcon } from '@vicons/ionicons5'

const message = useMessage()
const { t } = useI18n()

const handleCreateTask = () => {
  message.info('Create task feature coming soon')
}
</script>

<style scoped>
.tasks-page {
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
  font-size: 24px;
  font-weight: 600;
}

.coming-soon {
  padding: 60px 20px;
  text-align: center;
}
</style>
