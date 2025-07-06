import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BackupTask, CreateTaskRequest, TaskFilter, PaginationInfo, ApiResponse } from '@/types'
import { api } from '@/api'

export const useTasksStore = defineStore('tasks', () => {
  // State
  const tasks = ref<BackupTask[]>([])
  const currentTask = ref<BackupTask | null>(null)
  const isLoading = ref(false)
  const isCreating = ref(false)
  const isUpdating = ref(false)
  const isDeleting = ref(false)
  const pagination = ref<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0
  })
  const filter = ref<TaskFilter>({})

  // Getters
  const totalTasks = computed(() => pagination.value.total)
  const activeTasks = computed(() => tasks.value.filter(task => task.is_active))
  const inactiveTasks = computed(() => tasks.value.filter(task => !task.is_active))
  const tasksByType = computed(() => {
    const grouped: Record<string, BackupTask[]> = {}
    tasks.value.forEach(task => {
      if (!grouped[task.type]) {
        grouped[task.type] = []
      }
      grouped[task.type].push(task)
    })
    return grouped
  })

  // Actions
  const loadTasks = async (filters?: TaskFilter & PaginationInfo) => {
    isLoading.value = true
    try {
      const response = await api.getTasks(filters)
      if (response.success && response.data) {
        tasks.value = response.data.tasks
        pagination.value = response.data.pagination
        if (filters) {
          filter.value = { ...filters }
        }
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to load tasks' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load tasks' }
    } finally {
      isLoading.value = false
    }
  }

  const loadTask = async (id: number) => {
    try {
      const response = await api.getTask(id)
      if (response.success && response.data) {
        currentTask.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, error: response.error || 'Failed to load task' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load task' }
    }
  }

  const createTask = async (taskData: CreateTaskRequest) => {
    isCreating.value = true
    try {
      const response = await api.createTask(taskData)
      if (response.success && response.data) {
        tasks.value.unshift(response.data)
        pagination.value.total += 1
        return { success: true, data: response.data }
      }
      return { success: false, error: response.error || 'Failed to create task' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create task' }
    } finally {
      isCreating.value = false
    }
  }

  const updateTask = async (id: number, updates: Partial<CreateTaskRequest>) => {
    isUpdating.value = true
    try {
      const response = await api.updateTask(id, updates)
      if (response.success && response.data) {
        const index = tasks.value.findIndex(task => task.id === id)
        if (index !== -1) {
          tasks.value[index] = response.data
        }
        if (currentTask.value?.id === id) {
          currentTask.value = response.data
        }
        return { success: true, data: response.data }
      }
      return { success: false, error: response.error || 'Failed to update task' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update task' }
    } finally {
      isUpdating.value = false
    }
  }

  const deleteTask = async (id: number) => {
    isDeleting.value = true
    try {
      const response = await api.deleteTask(id)
      if (response.success) {
        tasks.value = tasks.value.filter(task => task.id !== id)
        pagination.value.total -= 1
        if (currentTask.value?.id === id) {
          currentTask.value = null
        }
        return { success: true }
      }
      return { success: false, error: response.error || 'Failed to delete task' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete task' }
    } finally {
      isDeleting.value = false
    }
  }

  const runTask = async (id: number) => {
    try {
      const response = await api.runTask(id)
      if (response.success) {
        // Update task's last_run time
        const task = tasks.value.find(t => t.id === id)
        if (task) {
          task.last_run = new Date().toISOString()
        }
        return { success: true, data: response.data }
      }
      return { success: false, error: response.error || 'Failed to run task' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to run task' }
    }
  }

  const toggleTask = async (id: number) => {
    try {
      const response = await api.toggleTask(id)
      if (response.success && response.data) {
        const index = tasks.value.findIndex(task => task.id === id)
        if (index !== -1) {
          tasks.value[index] = response.data
        }
        if (currentTask.value?.id === id) {
          currentTask.value = response.data
        }
        return { success: true, data: response.data }
      }
      return { success: false, error: response.error || 'Failed to toggle task' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to toggle task' }
    }
  }

  const refresh = async () => {
    return await loadTasks({ ...filter.value, ...pagination.value })
  }

  const clearCurrentTask = () => {
    currentTask.value = null
  }

  const setFilter = (newFilter: TaskFilter) => {
    filter.value = { ...newFilter }
  }

  const setPagination = (newPagination: Partial<PaginationInfo>) => {
    pagination.value = { ...pagination.value, ...newPagination }
  }

  return {
    // State
    tasks,
    currentTask,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    pagination,
    filter,
    
    // Getters
    totalTasks,
    activeTasks,
    inactiveTasks,
    tasksByType,
    
    // Actions
    loadTasks,
    loadTask,
    createTask,
    updateTask,
    deleteTask,
    runTask,
    toggleTask,
    refresh,
    clearCurrentTask,
    setFilter,
    setPagination
  }
})
