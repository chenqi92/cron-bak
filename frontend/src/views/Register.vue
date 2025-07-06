<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="title">注册备份服务账户</h1>
        <p class="subtitle">备份服务</p>
      </div>

      <div class="register-form">
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
          <label>确认密码</label>
          <input
            v-model="formData.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            class="form-input"
          />
        </div>

        <div class="form-item">
          <button
            type="button"
            :disabled="loading"
            class="register-button"
            @click="handleSubmit"
          >
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </div>
      </div>

      <div class="register-footer">
        <p>
          已有账户？
          <button type="button" class="link-button" @click="goToLogin">
            立即登录
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
  password: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  console.log('Register handleSubmit called')
  console.log('formData:', formData.value)

  try {
    // Simple validation check
    if (!formData.value.username || !formData.value.password || !formData.value.confirmPassword) {
      toast.warning('请填写所有字段')
      return
    }

    if (formData.value.password !== formData.value.confirmPassword) {
      toast.warning('两次输入的密码不一致')
      return
    }

    console.log('Starting registration process...')
    loading.value = true

    const result = await authStore.register({
      username: formData.value.username,
      password: formData.value.password,
      confirmPassword: formData.value.confirmPassword
    })

    console.log('Register result:', result)

    if (result.success) {
      toast.success('注册成功！', '正在跳转到仪表板...')
      setTimeout(async () => {
        await router.push('/dashboard')
      }, 1000)
    } else {
      toast.error('注册失败', result.error || '注册过程中发生错误')
    }
  } catch (error) {
    console.error('Register validation failed:', error)
    toast.error('注册失败', '网络连接错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
/* Same styles as Login.vue */
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

[data-theme='dark'] .register-card {
  background: #2a2a2a;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  margin-bottom: 16px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
}

[data-theme='dark'] .title {
  color: #e0e0e0;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

[data-theme='dark'] .subtitle {
  color: #999;
}

.register-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

[data-theme='dark'] .register-footer {
  border-color: #3a3a3a;
}

.register-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

[data-theme='dark'] .register-footer p {
  color: #999;
}

.register-form {
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

.register-button {
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

.register-button:hover {
  background: #16a085;
}

.register-button:disabled {
  background: #ccc;
  cursor: not-allowed;
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
  .register-card {
    padding: 24px;
    margin: 16px;
  }

  .title {
    font-size: 20px;
  }
}
</style>
