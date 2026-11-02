import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { clearHistory, createHistory, pushEntry, takeRedo, takeUndo } from '~/lib/history'
import { createId } from '~/lib/id'
import { cloneContent, contentEquals, emptyContent, isContentEmpty, normalizeContent } from '~/lib/note'
import { applyOp, invertOp, type NoteOp } from '~/lib/ops'
import { getStorage, loadDraft, removeDraft, saveDraft, type NoteDraft } from '~/lib/storage'
import type { NoteContent, TodoItem } from '~/lib/types'
import { useNotesStore } from './notes'

/** Continuous typing into one field becomes a single history entry after this pause. */
export const TEXT_COMMIT_DELAY = 600
/** The draft of an unsaved edit is written at most once per this interval. */
export const DRAFT_SAVE_DELAY = 500

export type TextTarget = { type: 'title' } | { type: 'text', id: string }

interface PendingText {
  target: TextTarget
  from: string
}

export type OpenResult = 'ok' | 'not-found'

export type SaveResult =
  | { status: 'saved', id: string }
  | { status: 'empty' }
  | { status: 'deleted' }
  | { status: 'conflict' }

export const useEditorStore = defineStore('editor', () => {
  const notesStore = useNotesStore()

  const noteId = ref<string | null>(null)
  const baseUpdatedAt = ref<number | null>(null)
  const base = ref<NoteContent>(emptyContent())
  const content = ref<NoteContent>(emptyContent())
  const history = reactive(createHistory<NoteOp>())
  const pending = ref<PendingText | null>(null)
  const active = ref(false)

  let textTimer: ReturnType<typeof setTimeout> | null = null
  let draftTimer: ReturnType<typeof setTimeout> | null = null

  const isNew = computed(() => noteId.value === null)
  const isDirty = computed(() => !contentEquals(content.value, base.value))
  const canUndo = computed(() => history.past.length > 0 || pendingOp() !== null)
  const canRedo = computed(() => history.future.length > 0 && pendingOp() === null)
  /** The stored note was deleted (e.g. in another tab) while it was being edited. */
  const isRemovedExternally = computed(() =>
    active.value && noteId.value !== null && notesStore.hydrated && !notesStore.getById(noteId.value),
  )
  /** The stored note was saved by someone else after this edit session started. */
  const isChangedExternally = computed(() => {
    if (!active.value || noteId.value === null) return false
    const note = notesStore.getById(noteId.value)
    return note !== undefined && note.updatedAt !== baseUpdatedAt.value
  })

  function clearTimer(timer: ReturnType<typeof setTimeout> | null): null {
    if (timer !== null) clearTimeout(timer)
    return null
  }

  function findItem(id: string): TodoItem | undefined {
    return content.value.todos.find(item => item.id === id)
  }

  function readTarget(target: TextTarget): string | undefined {
    return target.type === 'title' ? content.value.title : findItem(target.id)?.text
  }

  function sameTarget(a: TextTarget, b: TextTarget): boolean {
    return a.type === b.type && (a.type === 'title' || a.id === (b as { id: string }).id)
  }

  /** The not yet committed typing session as a history entry, or `null` if it changed nothing. */
  function pendingOp(): NoteOp | null {
    const current = pending.value
    if (!current) return null
    const to = readTarget(current.target)
    if (to === undefined || to === current.from) return null
    return current.target.type === 'title'
      ? { type: 'title', from: current.from, to }
      : { type: 'text', id: current.target.id, from: current.from, to }
  }

  function scheduleDraftSave(): void {
    draftTimer = clearTimer(draftTimer)
    draftTimer = setTimeout(flushDraft, DRAFT_SAVE_DELAY)
  }

  function record(op: NoteOp): void {
    pushEntry(history, op)
    scheduleDraftSave()
  }

  function commitText(): void {
    textTimer = clearTimer(textTimer)
    const op = pendingOp()
    pending.value = null
    if (op) record(op)
  }

  function setText(target: TextTarget, value: string): void {
    if (pending.value && !sameTarget(pending.value.target, target)) commitText()
    const current = readTarget(target)
    if (current === undefined) return
    if (!pending.value) pending.value = { target, from: current }

    if (target.type === 'title') content.value.title = value
    else findItem(target.id)!.text = value

    textTimer = clearTimer(textTimer)
    textTimer = setTimeout(commitText, TEXT_COMMIT_DELAY)
    scheduleDraftSave()
  }

  function setTitle(value: string): void {
    setText({ type: 'title' }, value)
  }

  function setItemText(id: string, value: string): void {
    setText({ type: 'text', id }, value)
  }

  function toggleItem(id: string): void {
    commitText()
    const item = findItem(id)
    if (!item) return
    const op: NoteOp = { type: 'toggle', id, from: item.done, to: !item.done }
    applyOp(content.value, op)
    record(op)
  }

  /** Adds an empty item (at the end by default) and returns its id. */
  function addItem(index = content.value.todos.length): string {
    commitText()
    const item: TodoItem = { id: createId(), text: '', done: false }
    const op: NoteOp = { type: 'add', index: Math.min(Math.max(index, 0), content.value.todos.length), item }
    applyOp(content.value, op)
    record(op)
    return item.id
  }

  function removeItem(id: string): void {
    commitText()
    const index = content.value.todos.findIndex(item => item.id === id)
    if (index === -1) return
    const op: NoteOp = { type: 'remove', index, item: { ...content.value.todos[index]! } }
    applyOp(content.value, op)
    record(op)
  }

  function undo(): boolean {
    commitText()
    const op = takeUndo(history)
    if (!op) return false
    applyOp(content.value, invertOp(op))
    scheduleDraftSave()
    return true
  }

  function redo(): boolean {
    commitText()
    const op = takeRedo(history)
    if (!op) return false
    applyOp(content.value, op)
    scheduleDraftSave()
    return true
  }

  function reset(id: string | null, source: NoteContent, updatedAt: number | null): void {
    textTimer = clearTimer(textTimer)
    draftTimer = clearTimer(draftTimer)
    noteId.value = id
    baseUpdatedAt.value = updatedAt
    base.value = cloneContent(source)
    content.value = cloneContent(source)
    pending.value = null
    clearHistory(history)
  }

  /** Starts an edit session of a stored note, or of a new note when `id` is `null`. */
  function open(id: string | null): OpenResult {
    if (id === null) {
      reset(null, emptyContent(), null)
      active.value = true
      return 'ok'
    }
    const note = notesStore.getById(id)
    if (!note) {
      reset(null, emptyContent(), null)
      active.value = false
      return 'not-found'
    }
    reset(note.id, note, note.updatedAt)
    active.value = true
    return 'ok'
  }

  function close(): void {
    flushDraft()
    reset(null, emptyContent(), null)
    active.value = false
  }

  /** A draft of an unsaved edit of the current note left by a previous page session, if it has changes. */
  function findDraft(): NoteDraft | null {
    const storage = getStorage()
    if (!storage) return null
    const draft = loadDraft(storage, noteId.value)
    if (!draft || contentEquals(draft.content, base.value)) return null
    return draft
  }

  function restoreDraft(draft: NoteDraft): void {
    textTimer = clearTimer(textTimer)
    pending.value = null
    baseUpdatedAt.value = draft.baseUpdatedAt
    content.value = cloneContent(draft.content)
    history.past = [...draft.history.past]
    history.future = [...draft.history.future]
  }

  function discardDraft(): void {
    draftTimer = clearTimer(draftTimer)
    const storage = getStorage()
    if (storage) removeDraft(storage, noteId.value)
  }

  /** Writes the current unsaved edit to storage, so it survives a page reload. */
  function flushDraft(): void {
    draftTimer = clearTimer(draftTimer)
    if (!active.value) return
    const storage = getStorage()
    if (!storage) return
    // A draft of a note deleted elsewhere would be orphaned: nothing could offer to restore it.
    if (!isDirty.value || isRemovedExternally.value) {
      removeDraft(storage, noteId.value)
      return
    }
    const op = pendingOp()
    saveDraft(storage, {
      noteId: noteId.value,
      baseUpdatedAt: baseUpdatedAt.value,
      content: cloneContent(content.value),
      history: { past: op ? [...history.past, op] : [...history.past], future: op ? [] : [...history.future] },
      savedAt: Date.now(),
    })
  }

  /**
   * Saves the edit. By default refuses to overwrite a note changed or deleted elsewhere;
   * `force` overwrites it, `asNew` saves the edit as a separate note.
   */
  function save(options: { force?: boolean, asNew?: boolean } = {}): SaveResult {
    commitText()
    const normalized = normalizeContent(content.value)
    const targetId = options.asNew ? null : noteId.value

    if (targetId === null && isContentEmpty(normalized)) return { status: 'empty' }

    let savedId: string
    let updatedAt: number
    if (targetId === null) {
      const note = notesStore.create(normalized)
      savedId = note.id
      updatedAt = note.updatedAt
    }
    else {
      const existing = notesStore.getById(targetId)
      if (!existing) return { status: 'deleted' }
      if (!options.force && existing.updatedAt !== baseUpdatedAt.value) return { status: 'conflict' }
      const note = notesStore.update(targetId, normalized)!
      savedId = note.id
      updatedAt = note.updatedAt
    }

    discardDraft()
    reset(savedId, normalized, updatedAt)
    return { status: 'saved', id: savedId }
  }

  /** Drops unsaved changes and history of the current edit session. */
  function cancel(): void {
    discardDraft()
    reset(noteId.value, base.value, baseUpdatedAt.value)
  }

  return {
    noteId,
    content,
    history,
    active,
    isNew,
    isDirty,
    canUndo,
    canRedo,
    isRemovedExternally,
    isChangedExternally,
    open,
    close,
    setTitle,
    setItemText,
    commitText,
    toggleItem,
    addItem,
    removeItem,
    undo,
    redo,
    findDraft,
    restoreDraft,
    discardDraft,
    flushDraft,
    save,
    cancel,
  }
})
