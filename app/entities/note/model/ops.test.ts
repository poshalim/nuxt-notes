import { describe, expect, it } from 'vitest'
import { cloneContent } from './content'
import { applyOp, invertOp, type NoteOp } from './ops'
import type { NoteContent } from './types'

function sample(): NoteContent {
  return {
    title: 'Shopping',
    todos: [
      { id: 'a', text: 'Milk', done: false },
      { id: 'b', text: 'Bread', done: true },
    ],
  }
}

const ops: NoteOp[] = [
  { type: 'title', from: 'Shopping', to: 'Groceries' },
  { type: 'text', id: 'a', from: 'Milk', to: 'Oat milk' },
  { type: 'toggle', id: 'b', from: true, to: false },
  { type: 'add', index: 1, item: { id: 'c', text: 'Eggs', done: false } },
  { type: 'remove', index: 0, item: { id: 'a', text: 'Milk', done: false } },
]

describe('note ops', () => {
  it.each(ops)('applying $type and its inverse restores the note', (op) => {
    const content = sample()
    applyOp(content, op)
    expect(content).not.toEqual(sample())
    applyOp(content, invertOp(op))
    expect(content).toEqual(sample())
  })

  it('inserts an added item at its index', () => {
    const content = sample()
    applyOp(content, ops[3]!)
    expect(content.todos.map(item => item.id)).toEqual(['a', 'c', 'b'])
  })

  it('restores a removed item at its original position', () => {
    const content = sample()
    const op: NoteOp = { type: 'remove', index: 1, item: { ...content.todos[1]! } }
    applyOp(content, op)
    applyOp(content, invertOp(op))
    expect(content).toEqual(sample())
  })

  it('does not share item objects between the op and the note', () => {
    const content = sample()
    const op = ops[3]! as Extract<NoteOp, { type: 'add' }>
    applyOp(content, op)
    content.todos[1]!.text = 'changed'
    expect(op.item.text).toBe('Eggs')
  })

  it('ignores ops for missing items', () => {
    const content = sample()
    const before = cloneContent(content)
    applyOp(content, { type: 'text', id: 'missing', from: '', to: 'x' })
    applyOp(content, { type: 'toggle', id: 'missing', from: false, to: true })
    applyOp(content, { type: 'remove', index: 0, item: { id: 'missing', text: '', done: false } })
    expect(content).toEqual(before)
  })
})
