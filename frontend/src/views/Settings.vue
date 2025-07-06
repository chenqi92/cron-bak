<template>
  <div class="settings-page">
    <div class="page-header">
      <h1>{{ $t('nav.settings') }}</h1>
    </div>
    
    <n-grid :cols="1" :y-gap="24">
      <!-- Appearance Settings -->
      <n-grid-item>
        <n-card :title="$t('settings.appearance')">
          <n-form :model="settingsForm" label-placement="left" label-width="120">
            <n-form-item :label="$t('settings.theme')">
              <n-radio-group v-model:value="settingsForm.theme" @update:value="handleThemeChange">
                <n-radio-button value="light">
                  <template #icon>
                    <n-icon>
                      <SunIcon />
                    </n-icon>
                  </template>
                  {{ $t('settings.lightTheme') }}
                </n-radio-button>
                <n-radio-button value="dark">
                  <template #icon>
                    <n-icon>
                      <MoonIcon />
                    </n-icon>
                  </template>
                  {{ $t('settings.darkTheme') }}
                </n-radio-button>
                <n-radio-button value="auto">
                  <template #icon>
                    <n-icon>
                      <DesktopIcon />
                    </n-icon>
                  </template>
                  {{ $t('settings.autoTheme') }}
                </n-radio-button>
              </n-radio-group>
            </n-form-item>
            
            <n-form-item :label="$t('settings.language')">
              <n-radio-group v-model:value="settingsForm.language" @update:value="handleLanguageChange">
                <n-radio-button value="zh">
                  {{ $t('settings.chinese') }}
                </n-radio-button>
                <n-radio-button value="en">
                  {{ $t('settings.english') }}
                </n-radio-button>
              </n-radio-group>
            </n-form-item>
          </n-form>
        </n-card>
      </n-grid-item>

      <!-- Dashboard Settings -->
      <n-grid-item>
        <n-card :title="$t('dashboard.title')">
          <n-form :model="settingsForm" label-placement="left" label-width="120">
            <n-form-item :label="$t('settings.autoRefresh')">
              <n-switch 
                v-model:value="settingsForm.autoRefresh" 
                @update:value="handleAutoRefreshChange"
              />
            </n-form-item>
            
            <n-form-item :label="$t('settings.refreshInterval')">
              <n-input-number
                v-model:value="settingsForm.refreshInterval"
                :min="5000"
                :max="300000"
                :step="5000"
                :disabled="!settingsForm.autoRefresh"
                @update:value="handleRefreshIntervalChange"
              >
                <template #suffix>
                  {{ $t('settings.seconds') }}
                </template>
              </n-input-number>
            </n-form-item>
          </n-form>
        </n-card>
      </n-grid-item>

      <!-- User Settings -->
      <n-grid-item>
        <n-card :title="$t('settings.userSettings')">
          <n-form label-placement="left" label-width="120">
            <n-form-item :label="$t('auth.username')">
              <n-input :value="username" readonly />
            </n-form-item>
            
            <n-form-item>
              <n-button @click="showChangePasswordModal = true">
                <template #icon>
                  <n-icon>
                    <KeyIcon />
                  </n-icon>
                </template>
                {{ $t('auth.changePassword') }}
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-grid-item>

      <!-- Actions -->
      <n-grid-item>
        <n-card>
          <n-space>
            <n-button type="primary" @click="handleSaveSettings">
              <template #icon>
                <n-icon>
                  <SaveIcon />
                </n-icon>
              </template>
              {{ $t('common.save') }}
            </n-button>
            
            <n-button @click="handleResetSettings">
              <template #icon>
                <n-icon>
                  <RefreshIcon />
                </n-icon>
              </template>
              {{ $t('settings.resetSettings') }}
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- Change Password Modal -->
    <n-modal v-model:show="showChangePasswordModal" preset="dialog" title="修改密码">
      <template #header>
        <div>{{ $t('auth.changePassword') }}</div>
      </template>
      
      <n-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-placement="left"
        label-width="100"
      >
        <n-form-item path="currentPassword" :label="$t('auth.currentPassword')">
          <n-input
            v-model:value="passwordForm.currentPassword"
            type="password"
            show-password-on="mousedown"
          />
        </n-form-item>
        
        <n-form-item path="newPassword" :label="$t('auth.newPassword')">
          <n-input
            v-model:value="passwordForm.newPassword"
            type="password"
            show-password-on="mousedown"
          />
        </n-form-item>
        
        <n-form-item path="confirmPassword" :label="$t('auth.confirmPassword')">
          <n-input
            v-model:value="passwordForm.confirmPassword"
            type="password"
            show-password-on="mousedown"
          />
        </n-form-item>
      </n-form>
      
      <template #action>
        <n-space>
          <n-button @click="showChangePasswordModal = false">
            {{ $t('common.cancel') }}
          </n-button>
          <n-button type="primary" :loading="passwordLoading" @click="handleChangePassword">
            {{ $t('common.confirm') }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog, type FormInst, type FormRules } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import {
  Sunny as SunIcon,
  Moon as MoonIcon,
  Desktop as DesktopIcon,
  Key as KeyIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@vicons/ionicons5'
import type { Theme, Language } from '@/types'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const appStore = useAppStore()
const { t } = useI18n()

const passwordFormRef = ref<FormInst | null>(null)
const showChangePasswordModal = ref(false)
const passwordLoading = ref(false)

const settingsForm = ref({
  theme: 'auto' as Theme,
  language: 'zh' as Language,
  autoRefresh: true,
  refreshInterval: 30000
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const username = computed(() => authStore.username)

const passwordRules: FormRules = {
  currentPassword: [
    {
      required: true,
      message: t('auth.passwordRequired'),
      trigger: ['input', 'blur']
    }
  ],
  newPassword: [
    {
      required: true,
      message: t('auth.passwordRequired'),
      trigger: ['input', 'blur']
    },
    {
      min: 6,
      message: t('auth.passwordMinLength'),
      trigger: ['input', 'blur']
    }
  ],
  confirmPassword: [
    {
      required: true,
      message: t('auth.confirmPasswordRequired'),
      trigger: ['input', 'blur']
    },
    {
      validator: (rule: any, value: string) => {
        return value === passwordForm.value.newPassword
      },
      message: t('auth.passwordMismatch'),
      trigger: ['input', 'blur']
    }
  ]
}

// Methods
const loadSettings = () => {
  settingsForm.value = {
    theme: appStore.theme,
    language: appStore.language,
    autoRefresh: appStore.autoRefresh,
    refreshInterval: appStore.refreshInterval
  }
}

const handleThemeChange = (theme: Theme) => {
  appStore.setTheme(theme)
}

const handleLanguageChange = (language: Language) => {
  appStore.setLanguage(language)
}

const handleAutoRefreshChange = (enabled: boolean) => {
  appStore.setAutoRefresh(enabled)
}

const handleRefreshIntervalChange = (interval: number | null) => {
  if (interval) {
    appStore.setRefreshInterval(interval)
  }
}

const handleSaveSettings = () => {
  appStore.saveSettings()
  message.success(t('settings.saveSuccess'))
}

const handleResetSettings = () => {
  dialog.warning({
    title: t('settings.resetSettings'),
    content: t('settings.confirmReset'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      appStore.resetSettings()
      loadSettings()
      message.success(t('settings.resetSuccess'))
    }
  })
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true

    const result = await authStore.changePassword(passwordForm.value)
    
    if (result.success) {
      message.success(t('auth.changePasswordSuccess'))
      showChangePasswordModal.value = false
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    } else {
      message.error(result.error || t('auth.changePasswordFailed'))
    }
  } catch (error) {
    console.error('Password change validation failed:', error)
  } finally {
    passwordLoading.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>
