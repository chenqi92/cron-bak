import { createApp } from 'vue'
import Toast from '@/components/Toast.vue'

interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

class ToastService {
  private toasts: Array<{ id: string; app: any }> = []

  show(options: ToastOptions) {
    const id = Math.random().toString(36).substr(2, 9)
    
    const app = createApp(Toast, {
      ...options,
      onClose: () => {
        this.remove(id)
      }
    })

    const container = document.createElement('div')
    container.id = `toast-${id}`
    document.body.appendChild(container)
    
    app.mount(container)
    
    this.toasts.push({ id, app })
  }

  success(title: string, message?: string, duration?: number) {
    this.show({ type: 'success', title, message, duration })
  }

  error(title: string, message?: string, duration?: number) {
    this.show({ type: 'error', title, message, duration })
  }

  warning(title: string, message?: string, duration?: number) {
    this.show({ type: 'warning', title, message, duration })
  }

  info(title: string, message?: string, duration?: number) {
    this.show({ type: 'info', title, message, duration })
  }

  private remove(id: string) {
    const index = this.toasts.findIndex(toast => toast.id === id)
    if (index > -1) {
      const toast = this.toasts[index]
      toast.app.unmount()
      
      const container = document.getElementById(`toast-${id}`)
      if (container) {
        container.remove()
      }
      
      this.toasts.splice(index, 1)
    }
  }

  clear() {
    this.toasts.forEach(toast => {
      toast.app.unmount()
      const container = document.getElementById(`toast-${toast.id}`)
      if (container) {
        container.remove()
      }
    })
    this.toasts = []
  }
}

export const toast = new ToastService()
