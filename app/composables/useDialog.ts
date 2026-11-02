import { computed, shallowRef } from 'vue'

export type DialogVariant = 'primary' | 'secondary' | 'danger'

export interface DialogAction {
  id: string
  label: string
  variant?: DialogVariant
  /** Receives focus when the dialog opens. Defaults to the first action. */
  autofocus?: boolean
}

export interface DialogOptions {
  title: string
  message?: string
  actions: DialogAction[]
}

interface DialogRequest extends DialogOptions {
  resolve: (actionId: string | null) => void
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const queue = shallowRef<DialogRequest[]>([])

/**
 * Promise-based modal dialogs rendered by `<DialogHost>`.
 * Requests are queued, so only one dialog is shown at a time.
 */
export function useDialog() {
  const current = computed(() => queue.value[0] ?? null)
  const isOpen = computed(() => current.value !== null)

  /** Resolves with the id of the chosen action, or `null` when the dialog is dismissed. */
  function choose(options: DialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      queue.value = [...queue.value, { ...options, resolve }]
    })
  }

  async function confirm(options: ConfirmOptions): Promise<boolean> {
    const result = await choose({
      title: options.title,
      message: options.message,
      actions: [
        { id: 'cancel', label: options.cancelLabel ?? 'Отмена', variant: 'secondary', autofocus: true },
        { id: 'confirm', label: options.confirmLabel ?? 'Подтвердить', variant: options.danger ? 'danger' : 'primary' },
      ],
    })
    return result === 'confirm'
  }

  function resolveCurrent(actionId: string | null) {
    const [request, ...rest] = queue.value
    if (!request) return
    queue.value = rest
    request.resolve(actionId)
  }

  return { current, isOpen, choose, confirm, resolveCurrent }
}
