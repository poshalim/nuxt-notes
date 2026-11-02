import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  variant: 'info' | 'success' | 'error'
}

const toasts = ref<Toast[]>([])
let nextId = 1

export function useToast() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function show(message: string, variant: Toast['variant'] = 'info', duration = 3000) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, message, variant }]
    setTimeout(() => dismiss(id), duration)
  }

  return { toasts, show, dismiss }
}
