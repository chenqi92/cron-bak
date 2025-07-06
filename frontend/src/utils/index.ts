import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/zh-cn'

// Configure dayjs
dayjs.extend(relativeTime)
dayjs.extend(duration)

// Format utilities
export const formatDate = (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(date).format(format)
}

export const formatRelativeTime = (date: string | Date) => {
  return dayjs(date).fromNow()
}

export const formatDuration = (seconds: number) => {
  if (!seconds || seconds < 0) return '-'
  
  const duration = dayjs.duration(seconds, 'seconds')
  const hours = duration.hours()
  const minutes = duration.minutes()
  const secs = duration.seconds()
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatUptime = (seconds: number) => {
  if (!seconds || seconds < 0) return '-'
  
  const duration = dayjs.duration(seconds, 'seconds')
  const days = Math.floor(duration.asDays())
  const hours = duration.hours()
  const minutes = duration.minutes()
  
  if (days > 0) {
    return `${days}天 ${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// Status utilities
export const getStatusColor = (status: string): 'success' | 'error' | 'info' | 'warning' | 'default' => {
  const statusColors: Record<string, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
    success: 'success',
    failed: 'error',
    running: 'info',
    pending: 'warning',
    cancelled: 'default',
    active: 'success',
    inactive: 'default',
    healthy: 'success',
    degraded: 'warning',
    error: 'error'
  }
  return statusColors[status] || 'default'
}

export const getStatusIcon = (status: string) => {
  const statusIcons: Record<string, string> = {
    success: 'checkmark-circle',
    failed: 'close-circle',
    running: 'play-circle',
    pending: 'time',
    cancelled: 'ban',
    active: 'checkmark-circle',
    inactive: 'pause-circle',
    healthy: 'checkmark-circle',
    degraded: 'warning',
    error: 'close-circle'
  }
  return statusIcons[status] || 'help-circle'
}

export const getTaskTypeLabel = (type: string) => {
  const typeLabels: Record<string, string> = {
    mysql_to_mysql: 'MySQL → MySQL',
    mysql_to_smb: 'MySQL → SMB',
    minio_to_minio: 'MinIO → MinIO'
  }
  return typeLabels[type] || type
}

export const getTaskTypeIcon = (type: string) => {
  const typeIcons: Record<string, string> = {
    mysql_to_mysql: 'server',
    mysql_to_smb: 'folder',
    minio_to_minio: 'cloud'
  }
  return typeIcons[type] || 'archive'
}

// Validation utilities
export const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validateUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const validateCron = (cron: string) => {
  // Basic cron validation (5 or 6 fields)
  const parts = cron.trim().split(/\s+/)
  return parts.length === 5 || parts.length === 6
}

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T) => {
  return array.reduce((groups, item) => {
    const group = item[key] as string
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let lastTime = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastTime >= wait) {
      lastTime = now
      func(...args)
    }
  }
}

// Copy to clipboard
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    
    try {
      document.execCommand('copy')
      return true
    } catch (err) {
      return false
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

// Download file
export const downloadFile = (data: string, filename: string, type = 'application/json') => {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

// Check if object is empty
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}
