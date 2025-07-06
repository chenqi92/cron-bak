<template>
  <Teleport to="body">
    <div v-if="visible" class="toast-container">
      <div :class="['toast', `toast-${type}`]">
        <div class="toast-icon">
          <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
          <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ title }}</div>
          <div v-if="message" class="toast-message">{{ message }}</div>
        </div>
        <button class="toast-close" @click="close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  onClose?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000
})

const visible = ref(false)

const close = () => {
  visible.value = false
  props.onClose?.()
}

onMounted(() => {
  visible.value = true
  
  if (props.duration > 0) {
    setTimeout(() => {
      close()
    }, props.duration)
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
  pointer-events: auto;
  animation: slideIn 0.3s ease-out;
}

.toast-success {
  border-left-color: #18a058;
}

.toast-error {
  border-left-color: #d03050;
}

.toast-warning {
  border-left-color: #f0a020;
}

.toast-info {
  border-left-color: #2080f0;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.toast-success .toast-icon {
  color: #18a058;
}

.toast-error .toast-icon {
  color: #d03050;
}

.toast-warning .toast-icon {
  color: #f0a020;
}

.toast-info .toast-icon {
  color: #2080f0;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.toast-message {
  font-size: 13px;
  line-height: 1.4;
  color: #666;
  margin-top: 4px;
}

.toast-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-close:hover {
  color: #666;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Dark mode support */
[data-theme='dark'] .toast {
  background: #2a2a2a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .toast-title {
  color: #e0e0e0;
}

[data-theme='dark'] .toast-message {
  color: #b0b0b0;
}

[data-theme='dark'] .toast-close {
  color: #888;
}

[data-theme='dark'] .toast-close:hover {
  color: #bbb;
}
</style>
