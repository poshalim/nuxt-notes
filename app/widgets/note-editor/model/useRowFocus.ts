import { nextTick, useTemplateRef } from 'vue'
import { useEditorStore } from '~/features/edit-note'

interface Focusable {
  focus: () => void
}

/**
 * Keyboard navigation between the title and the Todo rows.
 * Expects `ref="titleInput"` on the title field and `setRowRef` on every row.
 */
export function useRowFocus() {
  const editor = useEditorStore()
  const titleInput = useTemplateRef<HTMLInputElement>('titleInput')
  const rows = new Map<string, Focusable>()

  function setRowRef(id: string, el: unknown): void {
    if (el) rows.set(id, el as Focusable)
    else rows.delete(id)
  }

  /** Focuses the row with `id`, or the title when there is none. */
  async function focusRow(id?: string): Promise<void> {
    await nextTick()
    if (id) rows.get(id)?.focus()
    else titleInput.value?.focus()
  }

  function addItemAt(index: number): void {
    focusRow(editor.addItem(index))
  }

  function onTitleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) return
    event.preventDefault()
    const first = editor.content.todos[0]
    if (first) focusRow(first.id)
    else addItemAt(0)
  }

  function onRemoveEmpty(index: number): void {
    const previous = editor.content.todos[index - 1]
    editor.removeItem(editor.content.todos[index]!.id)
    focusRow(previous?.id)
  }

  function onNavigate(index: number, direction: -1 | 1): void {
    const target = editor.content.todos[index + direction]
    if (target) focusRow(target.id)
    else if (direction === -1) focusRow()
  }

  return { setRowRef, focusRow, addItemAt, onTitleKeydown, onRemoveEmpty, onNavigate }
}
