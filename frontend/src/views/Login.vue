<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="title">登录到备份服务</h1>
        <p class="subtitle">备份服务</p>
      </div>

      <div class="login-form">
        <div class="form-item">
          <label>用户名</label>
          <input
            v-model="formData.username"
            type="text"
            placeholder="请输入用户名"
            class="form-input"
          />
        </div>

        <div class="form-item">
          <label>密码</label>
          <input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            class="form-input"
          />
        </div>

        <div class="form-item">
          <button
            type="button"
            :disabled="loading"
            class="login-button"
            @click="handleSubmit"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>
      </div>

      <div class="login-footer">
        <p>
          还没有账户？
          <button type="button" class="link-button" @click="goToRegister">
            立即注册
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)

const formData = ref({
  username: '',
  password: ''
})

const handleSubmit = async () => {
  console.log('handleSubmit called')
  console.log('formData:', formData.value)

  try {
    // Simple validation check
    if (!formData.value.username || !formData.value.password) {
      toast.warning('请输入用户名和密码')
      return
    }

    console.log('Starting login process...')
    loading.value = true

    const result = await authStore.login(formData.value)
    console.log('Login result:', result)

    if (result.success) {
      toast.success('登录成功！', '正在跳转到仪表板...')
      console.log('Login successful, attempting to navigate to dashboard')
      console.log('Current auth state:', authStore.isAuthenticated)
      // 等待一下让用户看到成功消息
      setTimeout(async () => {
        console.log('Navigating to dashboard...')
        try {
          await router.push('/dashboard')
          console.log('Navigation completed')
        } catch (error) {
          console.error('Navigation failed:', error)
          toast.error('跳转失败', '请手动刷新页面')
        }
      }, 1000)
    } else {
      toast.error('登录失败', result.error || '用户名或密码错误')
    }
  } catch (error) {
    console.error('Login validation failed:', error)
    toast.error('登录失败', '网络连接错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  position: relative;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.login-form {
  margin-bottom: 24px;
}

.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #18a058;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.1);
}

.login-button {
  width: 100%;
  padding: 12px;
  background: #18a058;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.login-button:hover {
  background: #16a085;
}

.login-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.login-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.link-button {
  background: none;
  border: none;
  color: #18a058;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
}

.link-button:hover {
  color: #16a085;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px;
    margin: 16px;
  }

  .title {
    font-size: 20px;
  }
}
</style>
