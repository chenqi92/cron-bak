<template>
  <div class="logs-page">
    <div class="page-header">
      <h1>{{ $t('nav.logs') }}</h1>
    </div>
    
    <n-card>
      <div class="coming-soon">
        <n-empty size="large" description="Logs management coming soon..." />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.logs-page {
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
