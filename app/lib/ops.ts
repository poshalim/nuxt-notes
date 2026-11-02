import { cloneTodo } from './note'
import type { NoteContent, TodoItem } from './types'

/**
 * A reversible change of a note. Entries store only the delta, so the history
 * never holds full copies of the note.
 */
export type NoteOp =
  | { type: 'title', from: string, to: string }
  | { type: 'text', id: string, from: string, to: string }
  | { type: 'toggle', id: string, from: boolean, to: boolean }
  | { type: 'add', index: number, item: TodoItem }
  | { type: 'remove', index: number, item: TodoItem }

export function invertOp(op: NoteOp): NoteOp {
  switch (op.type) {
    case 'title':
    case 'text':
    case 'toggle':
      return { ...op, from: op.to, to: op.from } as NoteOp
    case 'add':
      return { type: 'remove', index: op.index, item: op.item }
    case 'remove':
      return { type: 'add', index: op.index, item: op.item }
  }
}

function findItem(content: NoteContent, id: string): TodoItem | undefined {
  return content.todos.find(item => item.id === id)
}

export function applyOp(content: NoteContent, op: NoteOp): void {
  switch (op.type) {
    case 'title':
      content.title = op.to
      break
    case 'text': {
      const item = findItem(content, op.id)
      if (item) item.text = op.to
      break
    }
    case 'toggle': {
      const item = findItem(content, op.id)
      if (item) item.done = op.to
      break
    }
    case 'add': {
      const index = Math.min(Math.max(op.index, 0), content.todos.length)
      content.todos.splice(index, 0, cloneTodo(op.item))
      break
    }
    case 'remove': {
      const index = content.todos.findIndex(item => item.id === op.item.id)
      if (index !== -1) content.todos.splice(index, 1)
      break
    }
  }
}
