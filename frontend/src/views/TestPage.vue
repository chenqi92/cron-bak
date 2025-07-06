<template>
  <div style="padding: 20px;">
    <h1>测试页面</h1>
    <p>如果你能看到这个页面，说明路由正常工作。</p>
    <p>当前时间: {{ currentTime }}</p>
    <n-button @click="updateTime" type="primary">更新时间</n-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentTime = ref('')

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

onMounted(() => {
  updateTime()
})
</script>
