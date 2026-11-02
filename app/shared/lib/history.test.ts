import { describe, expect, it } from 'vitest'
import { clearHistory, createHistory, HISTORY_LIMIT, pushEntry, takeRedo, takeUndo } from './history'

describe('history', () => {
  it('undoes and redoes entries in order', () => {
    const history = createHistory<number>()
    pushEntry(history, 1)
    pushEntry(history, 2)

    expect(takeUndo(history)).toBe(2)
    expect(takeUndo(history)).toBe(1)
    expect(takeUndo(history)).toBeUndefined()
    expect(takeRedo(history)).toBe(1)
    expect(takeRedo(history)).toBe(2)
    expect(takeRedo(history)).toBeUndefined()
  })

  it('drops the redo branch when a new entry is recorded after undo', () => {
    const history = createHistory<number>()
    pushEntry(history, 1)
    pushEntry(history, 2)
    takeUndo(history)

    pushEntry(history, 3)

    expect(history.future).toEqual([])
    expect(history.past).toEqual([1, 3])
  })

  it(`keeps at most ${HISTORY_LIMIT} entries, evicting the oldest`, () => {
    const history = createHistory<number>()
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) pushEntry(history, i)

    expect(history.past).toHaveLength(HISTORY_LIMIT)
    expect(history.past[0]).toBe(11)
    expect(history.past.at(-1)).toBe(HISTORY_LIMIT + 10)
  })

  it('respects a custom limit', () => {
    const history = createHistory<number>()
    for (let i = 1; i <= 5; i++) pushEntry(history, i, 3)
    expect(history.past).toEqual([3, 4, 5])
  })

  it('clears both stacks', () => {
    const history = createHistory<number>()
    pushEntry(history, 1)
    pushEntry(history, 2)
    takeUndo(history)
    clearHistory(history)
    expect(history).toEqual({ past: [], future: [] })
  })
})
