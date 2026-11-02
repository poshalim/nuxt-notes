import type { NoteContent, TodoItem } from './types'

export function emptyContent(): NoteContent {
  return { title: '', todos: [] }
}

export function cloneTodo(item: TodoItem): TodoItem {
  return { id: item.id, text: item.text, done: item.done }
}

export function cloneContent(content: NoteContent): NoteContent {
  return { title: content.title, todos: content.todos.map(cloneTodo) }
}

export function contentEquals(a: NoteContent, b: NoteContent): boolean {
  if (a.title !== b.title || a.todos.length !== b.todos.length) return false
  return a.todos.every((item, i) => {
    const other = b.todos[i]!
    return item.id === other.id && item.text === other.text && item.done === other.done
  })
}

/** Trims the title and drops todo items without text. */
export function normalizeContent(content: NoteContent): NoteContent {
  return {
    title: content.title.trim(),
    todos: content.todos
      .map(item => ({ ...item, text: item.text.trim() }))
      .filter(item => item.text.length > 0),
  }
}

export function isContentEmpty(content: NoteContent): boolean {
  const normalized = normalizeContent(content)
  return normalized.title === '' && normalized.todos.length === 0
}
