import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { draftKey, loadNotes, NOTES_KEY, saveNotes } from '~/lib/storage'
import { PERSIST_DELAY, useNotesStore } from '~/stores/notes'
import type { Note } from '~/lib/types'

const content = { title: 'Title', todos: [{ id: 't1', text: 'Item', done: false }] }

describe('notes store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.useRealTimers())

  it('hydrates from storage', () => {
    const note: Note = { id: 'n1', ...content, createdAt: 1, updatedAt: 1 }
    saveNotes(localStorage, [note])
    const store = useNotesStore()
    store.hydrate()
    expect(store.notes).toEqual([note])
    expect(store.hydrated).toBe(true)
  })

  it('batches writes instead of writing on every change', () => {
    const store = useNotesStore()
    store.hydrate()
    const setItem = vi.spyOn(localStorage, 'setItem')

    const a = store.create(content)
    store.update(a.id, { ...content, title: 'Changed' })
    store.create(content)
    expect(setItem).not.toHaveBeenCalled()

    vi.advanceTimersByTime(PERSIST_DELAY)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(loadNotes(localStorage)).toHaveLength(2)
    setItem.mockRestore()
  })

  it('flushes pending writes immediately on demand', () => {
    const store = useNotesStore()
    store.hydrate()
    store.create(content)
    store.flush()
    expect(loadNotes(localStorage)).toHaveLength(1)
  })

  it('copies content so later edits of the source do not leak into the store', () => {
    const store = useNotesStore()
    const source = structuredClone(content)
    const note = store.create(source)
    source.todos[0]!.text = 'leaked'
    expect(store.getById(note.id)!.todos[0]!.text).toBe('Item')
  })

  it('bumps updatedAt on every update', () => {
    const store = useNotesStore()
    const note = store.create(content)
    const updated = store.update(note.id, content)!
    expect(updated.updatedAt).toBeGreaterThan(note.updatedAt)
    expect(updated.createdAt).toBe(note.createdAt)
  })

  it('returns null when updating a missing note', () => {
    const store = useNotesStore()
    expect(store.update('missing', content)).toBeNull()
  })

  it('removes a note together with its draft', () => {
    const store = useNotesStore()
    const note = store.create(content)
    localStorage.setItem(draftKey(note.id), '{}')

    expect(store.remove(note.id)).toBe(true)
    expect(store.getById(note.id)).toBeUndefined()
    expect(localStorage.getItem(draftKey(note.id))).toBeNull()
    expect(store.remove(note.id)).toBe(false)
  })

  it('sorts notes by last update, newest first', () => {
    const store = useNotesStore()
    const a = store.create({ ...content, title: 'A' })
    store.create({ ...content, title: 'B' })
    store.update(a.id, { ...content, title: 'A2' })
    expect(store.sortedNotes.map(note => note.title)).toEqual(['A2', 'B'])
  })

  it('merges with changes written by another tab when flushing', () => {
    const store = useNotesStore()
    store.hydrate()
    store.create({ ...content, title: 'Mine' })
    const foreign: Note = { id: 'other', ...content, title: 'Theirs', createdAt: 1, updatedAt: 1 }
    saveNotes(localStorage, [foreign])

    store.flush()
    expect(loadNotes(localStorage).map(note => note.title).sort()).toEqual(['Mine', 'Theirs'])
  })

  it('applies changes from another tab, keeping unflushed local changes', () => {
    const store = useNotesStore()
    store.hydrate()
    const mine = store.create({ ...content, title: 'Mine' })
    const foreign: Note = { id: 'other', ...content, title: 'Theirs', createdAt: 1, updatedAt: 1 }

    store.applyExternal(JSON.stringify({ version: 1, notes: [foreign] }))
    expect(store.notes.map(note => note.id).sort()).toEqual([mine.id, 'other'].sort())

    store.flush()
    store.applyExternal(JSON.stringify({ version: 1, notes: [] }))
    expect(store.notes).toEqual([])
  })

  it('reacts to storage events of other tabs', () => {
    const store = useNotesStore()
    store.hydrate()
    const stop = store.startSync()
    const foreign: Note = { id: 'other', ...content, createdAt: 1, updatedAt: 1 }

    window.dispatchEvent(new StorageEvent('storage', {
      key: NOTES_KEY,
      newValue: JSON.stringify({ version: 1, notes: [foreign] }),
    }))
    expect(store.getById('other')).toEqual(foreign)
    stop()
  })

  it('flushes when the page is hidden', () => {
    const store = useNotesStore()
    store.hydrate()
    const stop = store.startSync()
    store.create(content)
    window.dispatchEvent(new Event('pagehide'))
    expect(loadNotes(localStorage)).toHaveLength(1)
    stop()
  })
})
