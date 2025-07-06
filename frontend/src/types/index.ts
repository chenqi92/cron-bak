// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// User Types
export interface User {
  id: number
  username: string
  email?: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  confirmPassword: string
}

// Task Types
export type TaskType = 'mysql_to_mysql' | 'mysql_to_smb' | 'minio_to_minio'

export type TaskStatus = 'active' | 'inactive'

export interface BackupTask {
  id: number
  name: string
  type: TaskType
  is_active: boolean
  schedule: string
  source_config: Record<string, any>
  destination_config: Record<string, any>
  last_run?: string
  next_run?: string
  created_at: string
  updated_at: string
  user_id?: number
}

export interface CreateTaskRequest {
  name: string
  type: TaskType
  schedule: string
  source_config: Record<string, any>
  destination_config: Record<string, any>
}

// Log Types
export type LogStatus = 'success' | 'failed' | 'running' | 'pending' | 'cancelled'

export interface BackupLog {
  id: number
  task_id: number
  task_name: string
  task_type: TaskType
  status: LogStatus
  started_at: string
  completed_at?: string
  duration?: number
  message?: string
  error_details?: string
  data_size?: number
  created_at: string
}

// Dashboard Types
export interface DashboardStats {
  tasks: {
    total: number
    active: number
    inactive: number
    byType: Record<TaskType, number>
  }
  backups: {
    successRate: number
    total: number
    successful: number
    failed: number
  }
  recentLogs: BackupLog[]
  runningBackups: BackupLog[]
  nextRuns: Array<{
    id: number
    name: string
    type: TaskType
    next_run: string
  }>
  systemInfo: {
    uptime: number
    nodeVersion: string
    platform: string
    memory: {
      heapUsed: number
      heapTotal: number
    }
    timestamp: string
  }
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  uptime: number
  memory: {
    heapUsed: number
    heapTotal: number
  }
  version: string
  environment: string
  database: string
  diskSpace: string
}

export interface StatisticsData {
  overall: {
    successRate: number
    totalBackups: number
    successfulBackups: number
    failedBackups: number
  }
  daily: Array<{
    date: string
    successful: number
    failed: number
    total: number
  }>
  byType: Record<TaskType, any>
  period: string
}

// Notification Types
export interface NotificationModule {
  id: number
  name: string
  type: string
  config: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserNotificationPreference {
  id: number
  user_id: number
  module_id: number
  is_enabled: boolean
  config: Record<string, any>
  created_at: string
  updated_at: string
}

// UI Types
export type Theme = 'light' | 'dark' | 'auto'
export type Language = 'zh' | 'en'

export interface AppSettings {
  theme: Theme
  language: Language
  autoRefresh: boolean
  refreshInterval: number
}

// Chart Types
export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
    tension?: number
  }>
}

// Menu Types
export interface MenuItem {
  key: string
  label: string
  icon?: string
  path?: string
  children?: MenuItem[]
}

// Form Types
export interface FormRule {
  required?: boolean
  message?: string
  trigger?: string | string[]
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (rule: any, value: any) => boolean | Promise<boolean>
}

export interface FormRules {
  [key: string]: FormRule | FormRule[]
}

// Pagination Types
export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
}

// Filter Types
export interface LogFilter {
  status?: LogStatus
  taskType?: TaskType
  dateRange?: [string, string]
  keyword?: string
}

export interface TaskFilter {
  active?: boolean
  type?: TaskType
  keyword?: string
}

// Export Types
export interface ExportData {
  timestamp: string
  version: string
  tasks: BackupTask[]
  logs: BackupLog[]
  statistics: StatisticsData
}
