import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(el => !el.hasAttribute('inert') && el.getClientRects().length > 0)
}

/**
 * Keeps keyboard focus inside `container` while `active` is true and returns it
 * to the previously focused element afterwards.
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let previouslyFocused: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !container.value) return
    const elements = focusable(container.value)
    if (elements.length === 0) {
      event.preventDefault()
      container.value.focus()
      return
    }
    const first = elements[0]!
    const last = elements.at(-1)!
    const current = document.activeElement
    if (event.shiftKey && (current === first || !container.value.contains(current))) {
      event.preventDefault()
      last.focus()
    }
    else if (!event.shiftKey && (current === last || !container.value.contains(current))) {
      event.preventDefault()
      first.focus()
    }
  }

  function onFocusIn(event: FocusEvent) {
    if (container.value && !container.value.contains(event.target as Node)) {
      const [first] = focusable(container.value)
      ;(first ?? container.value).focus()
    }
  }

  async function activate() {
    previouslyFocused = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('focusin', onFocusIn)
    await nextTick()
    if (!container.value) return
    const preferred = container.value.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferred ?? focusable(container.value)[0] ?? container.value).focus()
  }

  function deactivate() {
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('focusin', onFocusIn)
    if (previouslyFocused?.isConnected) previouslyFocused.focus()
    previouslyFocused = null
  }

  watch(active, (value) => {
    if (value) activate()
    else deactivate()
  }, { immediate: true })

  onBeforeUnmount(deactivate)
}
