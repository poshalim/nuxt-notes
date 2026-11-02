import { onBeforeUnmount, onMounted } from 'vue'

interface UndoHotkeysOptions {
  undo: () => void
  redo: () => void
  enabled: () => boolean
}

/**
 * Global Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y. The native undo of text fields is
 * suppressed (including Undo/Redo from the context menu), so the app history stays the
 * single source of truth and one keystroke never triggers two undos.
 */
export function useUndoHotkeys({ undo, redo, enabled }: UndoHotkeysOptions) {
  function onKeydown(event: KeyboardEvent) {
    if (event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || !enabled()) return
    // `code` keeps shortcuts working with non-latin keyboard layouts.
    if (event.code === 'KeyZ') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    else if (event.code === 'KeyY' && event.ctrlKey && !event.shiftKey) {
      event.preventDefault()
      redo()
    }
  }

  function onBeforeInput(event: InputEvent) {
    if (!enabled()) return
    if (event.inputType === 'historyUndo') {
      event.preventDefault()
      undo()
    }
    else if (event.inputType === 'historyRedo') {
      event.preventDefault()
      redo()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown, { capture: true })
    window.addEventListener('beforeinput', onBeforeInput, { capture: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown, { capture: true })
    window.removeEventListener('beforeinput', onBeforeInput, { capture: true })
  })
}
