<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <div class="error-message">
        <h1>页面未找到</h1>
        <p>抱歉，您访问的页面不存在或已被移除。</p>
      </div>
      <div class="error-actions">
        <n-space>
          <n-button type="primary" @click="goHome">
            <template #icon>
              <n-icon>
                <HomeIcon />
              </n-icon>
            </template>
            返回首页
          </n-button>
          <n-button @click="goBack">
            <template #icon>
              <n-icon>
                <ArrowBackIcon />
              </n-icon>
            </template>
            返回上页
          </n-button>
        </n-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon
} from '@vicons/ionicons5'

const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.not-found-content {
  text-align: center;
  color: white;
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 20px;
  opacity: 0.8;
}

.error-message h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.error-message p {
  font-size: 18px;
  margin: 0 0 32px 0;
  opacity: 0.9;
}

.error-actions {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .error-code {
    font-size: 80px;
  }
  
  .error-message h1 {
    font-size: 24px;
  }
  
  .error-message p {
    font-size: 16px;
  }
}
</style>
