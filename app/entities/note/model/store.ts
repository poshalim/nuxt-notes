import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createId } from '~/shared/lib'
import { cloneContent } from './content'
import { getStorage, loadNotes, NOTES_KEY, parseNotes, removeDraft, saveNotes } from '../api/storage'
import type { Note, NoteContent } from './types'

/** Writes to storage are batched: at most one write per this interval. */
export const PERSIST_DELAY = 300

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const hydrated = ref(false)
  const persistFailed = ref(false)

  /** Local changes not yet written to storage: `null` marks a deletion. */
  const pendingChanges = new Map<string, Note | null>()
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let lastTimestamp = 0

  const sortedNotes = computed(() =>
    [...notes.value].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  function now(): number {
    lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)
    return lastTimestamp
  }

  function hydrate(): void {
    const storage = getStorage()
    notes.value = storage ? loadNotes(storage) : []
    hydrated.value = true
  }

  function getById(id: string): Note | undefined {
    return notes.value.find(note => note.id === id)
  }

  function overlayPending(base: Note[]): Note[] {
    if (pendingChanges.size === 0) return base
    const byId = new Map(base.map(note => [note.id, note]))
    for (const [id, change] of pendingChanges) {
      if (change === null) byId.delete(id)
      else byId.set(id, change)
    }
    return [...byId.values()]
  }

  function flush(): void {
    if (flushTimer !== null) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    if (pendingChanges.size === 0) return
    const storage = getStorage()
    if (!storage) return
    // Merge with what other tabs may have written since our last read.
    const merged = overlayPending(loadNotes(storage))
    persistFailed.value = !saveNotes(storage, merged)
    if (!persistFailed.value) pendingChanges.clear()
  }

  function scheduleFlush(): void {
    if (flushTimer !== null) clearTimeout(flushTimer)
    flushTimer = setTimeout(flush, PERSIST_DELAY)
  }

  function commit(id: string, note: Note | null): void {
    pendingChanges.set(id, note)
    if (note === null) {
      notes.value = notes.value.filter(item => item.id !== id)
    }
    else {
      const index = notes.value.findIndex(item => item.id === id)
      if (index === -1) notes.value.push(note)
      else notes.value.splice(index, 1, note)
    }
    scheduleFlush()
  }

  function create(content: NoteContent): Note {
    const timestamp = now()
    const note: Note = { id: createId(), ...cloneContent(content), createdAt: timestamp, updatedAt: timestamp }
    commit(note.id, note)
    return note
  }

  function update(id: string, content: NoteContent): Note | null {
    const existing = getById(id)
    if (!existing) return null
    const note: Note = { ...existing, ...cloneContent(content), updatedAt: now() }
    commit(id, note)
    return note
  }

  function remove(id: string): boolean {
    if (!getById(id)) return false
    commit(id, null)
    const storage = getStorage()
    if (storage) removeDraft(storage, id)
    return true
  }

  /** Applies a change made by another tab, keeping local changes that are not flushed yet. */
  function applyExternal(raw: string | null): void {
    notes.value = overlayPending(parseNotes(raw))
  }

  /** Subscribes to cross-tab updates and flushes pending writes when the page is hidden. */
  function startSync(): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key === NOTES_KEY || event.key === null) applyExternal(event.newValue)
    }
    const onHide = () => flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }

  return {
    notes,
    hydrated,
    persistFailed,
    sortedNotes,
    hydrate,
    getById,
    create,
    update,
    remove,
    flush,
    applyExternal,
    startSync,
  }
})
