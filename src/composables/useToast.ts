import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  function push(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    success: (msg: string) => push(msg, 'success'),
    error: (msg: string) => push(msg, 'error'),
    info: (msg: string) => push(msg, 'info'),
  }
}
