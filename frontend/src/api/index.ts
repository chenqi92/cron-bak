import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type {
  ApiResponse,
  User,
  LoginRequest,
  RegisterRequest,
  BackupTask,
  CreateTaskRequest,
  BackupLog,
  DashboardStats,
  SystemHealth,
  StatisticsData,
  NotificationModule,
  UserNotificationPreference,
  ExportData,
  LogFilter,
  TaskFilter,
  PaginationInfo
} from '@/types'

class ApiClient {
  private instance: AxiosInstance
  private token: string | null = null

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data
      },
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken()
          window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || error.message)
      }
    )

    // Load token from localStorage
    this.loadToken()
  }

  private loadToken(): void {
    const token = localStorage.getItem('token')
    if (token) {
      this.token = token
    }
  }

  setToken(token: string): void {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken(): void {
    this.token = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // Auth API
  async login(data: LoginRequest): Promise<ApiResponse<{ token: string; user: User }>> {
    console.log('API client login called with:', data)
    console.log('Making request to:', this.instance.defaults.baseURL + '/auth/login')
    try {
      const response = await this.instance.post('/auth/login', data)
      console.log('API response received:', response)
      // Note: response interceptor already returns response.data, so response is the actual data
      return response
    } catch (error: any) {
      console.error('API request failed:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      throw error
    }
  }

  async register(data: RegisterRequest): Promise<ApiResponse<{ token: string; user: User }>> {
    return this.instance.post('/auth/register', data)
  }

  async logout(): Promise<ApiResponse> {
    return this.instance.post('/auth/logout')
  }

  async getAuthStatus(): Promise<ApiResponse<{ isAuthenticated: boolean; user?: User }>> {
    console.log('API: Getting auth status...')
    try {
      const response = await this.instance.get('/auth/status')
      console.log('API: Auth status response:', response)
      return response
    } catch (error: any) {
      console.error('API: Auth status failed:', error)
      throw error
    }
  }

  async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<ApiResponse> {
    return this.instance.post('/auth/change-password', data)
  }

  // Dashboard API
  async getDashboardOverview(): Promise<ApiResponse<DashboardStats>> {
    return this.instance.get('/dashboard/overview')
  }

  async getDashboardStatistics(days = 30): Promise<ApiResponse<StatisticsData>> {
    return this.instance.get(`/dashboard/statistics?days=${days}`)
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.instance.get('/dashboard/health')
  }

  async performCleanup(retentionDays = 30): Promise<ApiResponse<{ deletedLogs: number; freedSpace: string }>> {
    return this.instance.post('/dashboard/cleanup', { retentionDays })
  }

  async exportData(format = 'json'): Promise<ApiResponse<ExportData>> {
    return this.instance.get(`/dashboard/export?format=${format}`)
  }

  // Tasks API
  async getTasks(filter?: TaskFilter & PaginationInfo): Promise<ApiResponse<{
    tasks: BackupTask[]
    pagination: PaginationInfo
  }>> {
    const params = new URLSearchParams()
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    return this.instance.get(`/tasks?${params.toString()}`)
  }

  async getTask(id: number): Promise<ApiResponse<BackupTask>> {
    return this.instance.get(`/tasks/${id}`)
  }

  async createTask(data: CreateTaskRequest): Promise<ApiResponse<BackupTask>> {
    return this.instance.post('/tasks', data)
  }

  async updateTask(id: number, data: Partial<CreateTaskRequest>): Promise<ApiResponse<BackupTask>> {
    return this.instance.put(`/tasks/${id}`, data)
  }

  async deleteTask(id: number): Promise<ApiResponse> {
    return this.instance.delete(`/tasks/${id}`)
  }

  async runTask(id: number): Promise<ApiResponse> {
    return this.instance.post(`/tasks/${id}/run`)
  }

  async toggleTaskStatus(id: number): Promise<ApiResponse<BackupTask>> {
    return this.instance.post(`/tasks/${id}/toggle`)
  }

  // Logs API
  async getLogs(filter?: LogFilter & PaginationInfo): Promise<ApiResponse<{
    logs: BackupLog[]
    pagination: PaginationInfo
  }>> {
    const params = new URLSearchParams()
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','))
          } else {
            params.append(key, String(value))
          }
        }
      })
    }
    return this.instance.get(`/logs?${params.toString()}`)
  }

  async getLog(id: number): Promise<ApiResponse<BackupLog>> {
    return this.instance.get(`/logs/${id}`)
  }

  async deleteLog(id: number): Promise<ApiResponse> {
    return this.instance.delete(`/logs/${id}`)
  }

  // Notifications API
  async getNotificationModules(): Promise<ApiResponse<NotificationModule[]>> {
    return this.instance.get('/notifications/modules')
  }

  async createNotificationModule(data: Omit<NotificationModule, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<NotificationModule>> {
    return this.instance.post('/notifications/modules', data)
  }

  async updateNotificationModule(id: number, data: Partial<NotificationModule>): Promise<ApiResponse<NotificationModule>> {
    return this.instance.put(`/notifications/modules/${id}`, data)
  }

  async deleteNotificationModule(id: number): Promise<ApiResponse> {
    return this.instance.delete(`/notifications/modules/${id}`)
  }

  async testNotificationModule(id: number): Promise<ApiResponse> {
    return this.instance.post(`/notifications/modules/${id}/test`)
  }

  async getUserNotificationPreferences(): Promise<ApiResponse<UserNotificationPreference[]>> {
    return this.instance.get('/notifications/preferences')
  }

  async updateUserNotificationPreference(
    moduleId: number,
    data: Partial<UserNotificationPreference>
  ): Promise<ApiResponse<UserNotificationPreference>> {
    return this.instance.put(`/notifications/preferences/${moduleId}`, data)
  }

  // Utility methods
  async testConnection(config: Record<string, any>, type: string): Promise<ApiResponse> {
    return this.instance.post('/test-connection', { config, type })
  }

  async getTaskTypes(): Promise<ApiResponse<Array<{ value: string; label: string }>>> {
    return this.instance.get('/task-types')
  }

  async getSchedulePresets(): Promise<ApiResponse<Array<{ value: string; label: string; description: string }>>> {
    return this.instance.get('/schedule-presets')
  }
}

export const api = new ApiClient()
export default api
