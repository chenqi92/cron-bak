import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import type { Storage, CreateStorageRequest, UpdateStorageRequest, StorageTestResult } from '@/types'

export const useStorageStore = defineStore('storage', () => {
  // State
  const storages = ref<Storage[]>([])
  const isLoading = ref(false)
  const testResults = ref<Map<string, StorageTestResult>>(new Map())

  // Getters
  const storageList = computed(() => storages.value)
  const storageCount = computed(() => storages.value.length)
  const storagesByType = computed(() => {
    const grouped: Record<string, Storage[]> = {}
    storages.value.forEach(storage => {
      if (!grouped[storage.type]) {
        grouped[storage.type] = []
      }
      grouped[storage.type].push(storage)
    })
    return grouped
  })

  const getStorageById = computed(() => {
    return (id: string) => storages.value.find(s => s.id === id)
  })

  const getStoragesByType = computed(() => {
    return (type: string) => storages.value.filter(s => s.type === type)
  })

  const getTestResult = computed(() => {
    return (id: string) => testResults.value.get(id)
  })

  // Actions
  const loadStorages = async () => {
    isLoading.value = true
    try {
      console.log('StorageStore: Loading storages...')
      const response = await api.getStorages()
      console.log('StorageStore: Storages response:', response)
      
      if (response.success && response.data) {
        storages.value = response.data
        console.log('StorageStore: Storages loaded:', storages.value.length)
        return { success: true }
      }
      
      console.error('StorageStore: Failed to load storages:', response.error)
      return { success: false, error: response.error || 'Failed to load storages' }
    } catch (error: any) {
      console.error('StorageStore: Load storages error:', error)
      return { success: false, error: error.message || 'Failed to load storages' }
    } finally {
      isLoading.value = false
    }
  }

  const createStorage = async (data: CreateStorageRequest) => {
    try {
      console.log('StorageStore: Creating storage:', data)
      const response = await api.createStorage(data)
      console.log('StorageStore: Create response:', response)
      
      if (response.success && response.data) {
        storages.value.push(response.data)
        console.log('StorageStore: Storage created successfully')
        return { success: true, data: response.data }
      }
      
      console.error('StorageStore: Failed to create storage:', response.error)
      return { success: false, error: response.error || 'Failed to create storage' }
    } catch (error: any) {
      console.error('StorageStore: Create storage error:', error)
      return { success: false, error: error.message || 'Failed to create storage' }
    }
  }

  const updateStorage = async (id: string, data: UpdateStorageRequest) => {
    try {
      console.log('StorageStore: Updating storage:', id, data)
      const response = await api.updateStorage(id, data)
      console.log('StorageStore: Update response:', response)
      
      if (response.success && response.data) {
        const index = storages.value.findIndex(s => s.id === id)
        if (index !== -1) {
          storages.value[index] = response.data
        }
        console.log('StorageStore: Storage updated successfully')
        return { success: true, data: response.data }
      }
      
      console.error('StorageStore: Failed to update storage:', response.error)
      return { success: false, error: response.error || 'Failed to update storage' }
    } catch (error: any) {
      console.error('StorageStore: Update storage error:', error)
      return { success: false, error: error.message || 'Failed to update storage' }
    }
  }

  const deleteStorage = async (id: string) => {
    try {
      console.log('StorageStore: Deleting storage:', id)
      const response = await api.deleteStorage(id)
      console.log('StorageStore: Delete response:', response)
      
      if (response.success) {
        const index = storages.value.findIndex(s => s.id === id)
        if (index !== -1) {
          storages.value.splice(index, 1)
        }
        // Remove test result
        testResults.value.delete(id)
        console.log('StorageStore: Storage deleted successfully')
        return { success: true }
      }
      
      console.error('StorageStore: Failed to delete storage:', response.error)
      return { success: false, error: response.error || 'Failed to delete storage' }
    } catch (error: any) {
      console.error('StorageStore: Delete storage error:', error)
      return { success: false, error: error.message || 'Failed to delete storage' }
    }
  }

  const testStorage = async (id: string) => {
    try {
      console.log('StorageStore: Testing storage:', id)
      const response = await api.testStorage(id)
      console.log('StorageStore: Test response:', response)
      
      if (response.success && response.data) {
        testResults.value.set(id, response.data)
        console.log('StorageStore: Storage test completed')
        return { success: true, data: response.data }
      }
      
      console.error('StorageStore: Failed to test storage:', response.error)
      return { success: false, error: response.error || 'Failed to test storage' }
    } catch (error: any) {
      console.error('StorageStore: Test storage error:', error)
      return { success: false, error: error.message || 'Failed to test storage' }
    }
  }

  const testAllStorages = async () => {
    try {
      console.log('StorageStore: Testing all storages...')
      const response = await api.testAllStorages()
      console.log('StorageStore: Test all response:', response)
      
      if (response.success && response.data) {
        // Update test results
        response.data.forEach(result => {
          testResults.value.set(result.storageId, result)
        })
        console.log('StorageStore: All storages tested')
        return { success: true, data: response.data }
      }
      
      console.error('StorageStore: Failed to test all storages:', response.error)
      return { success: false, error: response.error || 'Failed to test all storages' }
    } catch (error: any) {
      console.error('StorageStore: Test all storages error:', error)
      return { success: false, error: error.message || 'Failed to test all storages' }
    }
  }

  const refresh = async () => {
    return await loadStorages()
  }

  const init = async () => {
    console.log('StorageStore: Initializing...')
    const result = await loadStorages()
    console.log('StorageStore: Initialization result:', result)
    return result
  }

  return {
    // State
    storages,
    isLoading,
    testResults,
    
    // Getters
    storageList,
    storageCount,
    storagesByType,
    getStorageById,
    getStoragesByType,
    getTestResult,
    
    // Actions
    loadStorages,
    createStorage,
    updateStorage,
    deleteStorage,
    testStorage,
    testAllStorages,
    refresh,
    init
  }
})
