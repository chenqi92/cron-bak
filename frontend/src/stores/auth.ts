import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest, RegisterRequest } from '@/types'
import { api } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const username = computed(() => user.value?.username || '')

  // Actions
  const login = async (credentials: LoginRequest) => {
    isLoading.value = true
    console.log('Auth store login called with:', credentials)
    try {
      console.log('Calling api.login...')
      const response = await api.login(credentials)
      console.log('API response:', response)

      if (response.success && response.token && response.user) {
        console.log('Login successful, setting token and user')
        token.value = response.token
        user.value = response.user
        api.setToken(response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return { success: true }
      }
      console.log('Login failed, response:', response)
      return { success: false, error: response.error || response.message || 'Login failed' }
    } catch (error: any) {
      console.error('Login error caught:', error)
      return { success: false, error: error.message || 'Login failed' }
    } finally {
      isLoading.value = false
    }
  }

  const register = async (userData: RegisterRequest) => {
    isLoading.value = true
    try {
      const response = await api.register(userData)
      if (response.success && response.token && response.user) {
        token.value = response.token
        user.value = response.user
        api.setToken(response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return { success: true }
      }
      return { success: false, error: response.error || response.message || 'Registration failed' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      token.value = null
      user.value = null
      api.clearToken()
    }
  }

  const checkAuthStatus = async () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (!savedToken || !savedUser) {
      console.log('No saved token or user found')
      return false
    }

    try {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
      api.setToken(savedToken)

      console.log('Checking auth status with server...')
      // Verify token with server
      const response = await api.getAuthStatus()
      console.log('Auth status response:', response)

      if (response.success && response.isAuthenticated) {
        if (response.user) {
          user.value = response.user
          localStorage.setItem('user', JSON.stringify(response.user))
        }
        console.log('Auth status check successful')
        return true
      } else {
        console.log('Auth status check failed, logging out')
        await logout()
        return false
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      await logout()
      return false
    }
  }

  const changePassword = async (passwordData: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => {
    isLoading.value = true
    try {
      const response = await api.changePassword(passwordData)
      return { success: response.success, error: response.error }
    } catch (error: any) {
      return { success: false, error: error.message || 'Password change failed' }
    } finally {
      isLoading.value = false
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  return {
    // State
    user,
    token,
    isLoading,
    
    // Getters
    isAuthenticated,
    username,
    
    // Actions
    login,
    register,
    logout,
    checkAuthStatus,
    changePassword,
    updateUser
  }
})
