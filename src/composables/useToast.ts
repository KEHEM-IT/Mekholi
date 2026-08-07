import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  /** When set, the toast shows an Undo button and stays 5s instead of 3s. */
  action?: {
    label: string
    onClick: () => void
    /** Optional label shown after the action is taken (e.g. "Restored"). */
    doneLabel?: string
  }
}

const toasts = ref<Toast[]>([])
let nextId = 0

const DEFAULT_DURATION = 3000
const ACTION_DURATION = 5000 // undoable toasts stay longer

export function useToast() {
  function push(message: string, type: Toast['type'] = 'info', duration = DEFAULT_DURATION) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  /** Undoable toast — shows an action button and stays 5 seconds. */
  function pushAction(message: string, action: Toast['action'], type: Toast['type'] = 'success') {
    const id = nextId++
    toasts.value.push({ id, message, type, action })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, ACTION_DURATION)
  }

  /** Dismiss one toast by id (used by Undo after it executes). */
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    success: (msg: string) => push(msg, 'success'),
    error: (msg: string) => push(msg, 'error'),
    warning: (msg: string) => push(msg, 'warning'),
    info: (msg: string) => push(msg, 'info'),
    action: (msg: string, action: Toast['action'], type: Toast['type'] = 'success') =>
      pushAction(msg, action, type),
    dismiss,
  }
}
