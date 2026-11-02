import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HISTORY_LIMIT } from '~/lib/history'
import { loadDraft } from '~/lib/storage'
import { DRAFT_SAVE_DELAY, TEXT_COMMIT_DELAY, useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

function setup() {
  const notes = useNotesStore()
  notes.hydrate()
  const note = notes.create({
    title: 'Title',
    todos: [
      { id: 'a', text: 'First', done: false },
      { id: 'b', text: 'Second', done: false },
    ],
  })
  const editor = useEditorStore()
  editor.open(note.id)
  return { notes, editor, note }
}

function type(editor: ReturnType<typeof useEditorStore>, value: string, id?: string) {
  for (let i = 1; i <= value.length; i++) {
    if (id) editor.setItemText(id, value.slice(0, i))
    else editor.setTitle(value.slice(0, i))
  }
}

describe('editor store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.useRealTimers())

  describe('opening', () => {
    it('reports a missing note', () => {
      useNotesStore().hydrate()
      expect(useEditorStore().open('missing')).toBe('not-found')
      expect(useEditorStore().active).toBe(false)
    })

    it('starts a clean session for a new note', () => {
      useNotesStore().hydrate()
      const editor = useEditorStore()
      expect(editor.open(null)).toBe('ok')
      expect(editor.isNew).toBe(true)
      expect(editor.content).toEqual({ title: '', todos: [] })
      expect(editor.isDirty).toBe(false)
    })

    it('edits a copy of the stored note', () => {
      const { editor, notes, note } = setup()
      editor.toggleItem('a')
      expect(notes.getById(note.id)!.todos[0]!.done).toBe(false)
    })
  })

  describe('text input grouping', () => {
    it('records continuous typing as one entry after a pause', () => {
      const { editor } = setup()
      editor.setTitle('')
      type(editor, 'Hello')
      expect(editor.history.past).toHaveLength(0)

      vi.advanceTimersByTime(TEXT_COMMIT_DELAY)
      expect(editor.history.past).toEqual([{ type: 'title', from: 'Title', to: 'Hello' }])
    })

    it('commits on blur', () => {
      const { editor } = setup()
      type(editor, 'Hi', 'a')
      editor.commitText()
      expect(editor.history.past).toEqual([{ type: 'text', id: 'a', from: 'First', to: 'Hi' }])
    })

    it('starts a new entry when typing moves to another field', () => {
      const { editor } = setup()
      type(editor, 'X', 'a')
      type(editor, 'Y', 'b')
      editor.commitText()
      expect(editor.history.past.map(op => op.type)).toEqual(['text', 'text'])
    })

    it('records nothing when the text ends up unchanged', () => {
      const { editor } = setup()
      editor.setTitle('Titl')
      editor.setTitle('Title')
      editor.commitText()
      expect(editor.history.past).toHaveLength(0)
    })

    it('undo commits pending typing and reverts it at once', () => {
      const { editor } = setup()
      type(editor, 'New title')
      expect(editor.canUndo).toBe(true)
      editor.undo()
      expect(editor.content.title).toBe('Title')
      editor.redo()
      expect(editor.content.title).toBe('New title')
    })
  })

  describe('atomic entries', () => {
    it('records toggle, add and remove separately', () => {
      const { editor } = setup()
      editor.toggleItem('a')
      const id = editor.addItem()
      editor.removeItem('b')
      expect(editor.history.past.map(op => op.type)).toEqual(['toggle', 'add', 'remove'])
      expect(editor.content.todos.map(item => item.id)).toEqual(['a', id])
      expect(editor.content.todos[0]!.done).toBe(true)
    })

    it('adds an item at the given position', () => {
      const { editor } = setup()
      const id = editor.addItem(1)
      expect(editor.content.todos.map(item => item.id)).toEqual(['a', id, 'b'])
    })

    it('undoes and redoes everything back and forth', () => {
      const { editor, note } = setup()
      editor.toggleItem('a')
      const id = editor.addItem(0)
      type(editor, 'Typed', id)
      editor.removeItem('b')
      type(editor, 'Renamed')
      const edited = JSON.parse(JSON.stringify(editor.content))

      while (editor.undo()) { /* undo all */ }
      expect(editor.content).toEqual({ title: note.title, todos: note.todos })
      expect(editor.isDirty).toBe(false)

      while (editor.redo()) { /* redo all */ }
      expect(editor.content).toEqual(edited)
    })

    it('restores the text a removed item had at removal time', () => {
      const { editor } = setup()
      type(editor, 'Edited', 'a')
      editor.removeItem('a')
      editor.undo()
      expect(editor.content.todos[0]).toEqual({ id: 'a', text: 'Edited', done: false })
      editor.undo()
      expect(editor.content.todos[0]!.text).toBe('First')
    })

    it('drops the redo branch on a new change after undo', () => {
      const { editor } = setup()
      editor.toggleItem('a')
      editor.toggleItem('b')
      editor.undo()
      expect(editor.canRedo).toBe(true)
      editor.addItem()
      expect(editor.canRedo).toBe(false)
      expect(editor.redo()).toBe(false)
    })

    it('typing after undo drops the redo branch too', () => {
      const { editor } = setup()
      editor.toggleItem('a')
      editor.undo()
      editor.setTitle('T')
      expect(editor.canRedo).toBe(false)
      editor.commitText()
      expect(editor.history.future).toEqual([])
    })
  })

  describe('history limit', () => {
    it(`keeps only the last ${HISTORY_LIMIT} steps as deltas`, () => {
      const { editor } = setup()
      for (let i = 0; i < HISTORY_LIMIT + 5; i++) editor.toggleItem('a')
      expect(editor.history.past).toHaveLength(HISTORY_LIMIT)
      expect(editor.history.past.every(op => op.type === 'toggle' && !('todos' in op))).toBe(true)

      let undone = 0
      while (editor.undo()) undone++
      expect(undone).toBe(HISTORY_LIMIT)
    })
  })

  describe('saving', () => {
    it('saves normalized content and resets the history', () => {
      const { editor, notes, note } = setup()
      editor.setTitle('  Trimmed  ')
      const empty = editor.addItem()
      editor.setItemText(empty, '   ')
      editor.toggleItem('a')

      expect(editor.save()).toEqual({ status: 'saved', id: note.id })
      const saved = notes.getById(note.id)!
      expect(saved.title).toBe('Trimmed')
      expect(saved.todos.map(item => item.id)).toEqual(['a', 'b'])
      expect(saved.todos[0]!.done).toBe(true)
      expect(editor.history.past).toEqual([])
      expect(editor.history.future).toEqual([])
      expect(editor.isDirty).toBe(false)
      expect(editor.canUndo).toBe(false)
    })

    it('creates a new note and continues editing it', () => {
      const notes = useNotesStore()
      notes.hydrate()
      const editor = useEditorStore()
      editor.open(null)
      editor.setTitle('Fresh')
      const result = editor.save()
      expect(result.status).toBe('saved')
      const id = (result as { id: string }).id
      expect(notes.getById(id)!.title).toBe('Fresh')
      expect(editor.noteId).toBe(id)
      expect(editor.isNew).toBe(false)
    })

    it('refuses to create an empty note', () => {
      useNotesStore().hydrate()
      const editor = useEditorStore()
      editor.open(null)
      editor.setTitle('   ')
      editor.addItem()
      expect(editor.save()).toEqual({ status: 'empty' })
      expect(useNotesStore().notes).toHaveLength(0)
    })

    it('allows clearing an existing note title', () => {
      const { editor, notes, note } = setup()
      editor.setTitle('')
      expect(editor.save().status).toBe('saved')
      expect(notes.getById(note.id)!.title).toBe('')
    })

    it('detects a note deleted elsewhere and can save the edit as a new note', () => {
      const { editor, notes, note } = setup()
      editor.toggleItem('a')
      notes.remove(note.id)

      expect(editor.isRemovedExternally).toBe(true)
      expect(editor.save()).toEqual({ status: 'deleted' })

      const result = editor.save({ asNew: true })
      expect(result.status).toBe('saved')
      const id = (result as { id: string }).id
      expect(id).not.toBe(note.id)
      expect(notes.getById(id)!.todos[0]!.done).toBe(true)
      expect(editor.isRemovedExternally).toBe(false)
    })

    it('detects a note changed elsewhere and overwrites it only when forced', () => {
      const { editor, notes, note } = setup()
      editor.setTitle('Mine')
      notes.update(note.id, { title: 'Theirs', todos: [] })

      expect(editor.isChangedExternally).toBe(true)
      expect(editor.save()).toEqual({ status: 'conflict' })
      expect(editor.save({ force: true }).status).toBe('saved')
      expect(notes.getById(note.id)!.title).toBe('Mine')
      expect(editor.isChangedExternally).toBe(false)
    })
  })

  describe('cancel', () => {
    it('reverts changes, clears history and the draft', () => {
      const { editor, note } = setup()
      editor.toggleItem('a')
      vi.advanceTimersByTime(DRAFT_SAVE_DELAY)
      expect(loadDraft(localStorage, note.id)).not.toBeNull()

      editor.cancel()
      expect(editor.content.todos[0]!.done).toBe(false)
      expect(editor.history.past).toEqual([])
      expect(loadDraft(localStorage, note.id)).toBeNull()
    })
  })

  describe('drafts', () => {
    it('writes the draft with a delay, not on every change', () => {
      const { editor, note, notes } = setup()
      notes.flush()
      const setItem = vi.spyOn(localStorage, 'setItem')
      type(editor, 'Typing quickly')
      expect(setItem).not.toHaveBeenCalled()

      vi.advanceTimersByTime(DRAFT_SAVE_DELAY)
      expect(setItem).toHaveBeenCalledTimes(1)
      expect(loadDraft(localStorage, note.id)!.content.title).toBe('Typing quickly')
      setItem.mockRestore()
    })

    it('includes uncommitted typing in the draft history', () => {
      const { editor, note } = setup()
      type(editor, 'Abc')
      editor.flushDraft()
      expect(loadDraft(localStorage, note.id)!.history.past).toEqual([{ type: 'title', from: 'Title', to: 'Abc' }])
    })

    it('removes the draft once the edit matches the stored note again', () => {
      const { editor, note } = setup()
      editor.toggleItem('a')
      editor.flushDraft()
      editor.undo()
      editor.flushDraft()
      expect(loadDraft(localStorage, note.id)).toBeNull()
    })

    it('restores a draft after a reload with working undo', () => {
      const { editor, note } = setup()
      editor.toggleItem('a')
      type(editor, 'Draft title')
      editor.flushDraft()
      useNotesStore().flush()

      setActivePinia(createPinia())
      useNotesStore().hydrate()
      const reloaded = useEditorStore()
      reloaded.open(note.id)
      const draft = reloaded.findDraft()
      expect(draft).not.toBeNull()

      reloaded.restoreDraft(draft!)
      expect(reloaded.content.title).toBe('Draft title')
      expect(reloaded.isDirty).toBe(true)
      reloaded.undo()
      expect(reloaded.content.title).toBe('Title')
      reloaded.undo()
      expect(reloaded.isDirty).toBe(false)
    })

    it('keeps drafts of new notes separately', () => {
      useNotesStore().hydrate()
      const editor = useEditorStore()
      editor.open(null)
      editor.setTitle('Unsaved')
      editor.flushDraft()
      expect(loadDraft(localStorage, null)!.content.title).toBe('Unsaved')

      editor.open(null)
      expect(editor.findDraft()!.content.title).toBe('Unsaved')
    })

    it('offers a draft based on an outdated version and then reports a conflict', () => {
      const { editor, notes, note } = setup()
      editor.setTitle('Draft')
      editor.flushDraft()
      editor.close()
      notes.update(note.id, { title: 'Newer', todos: [] })

      editor.open(note.id)
      editor.restoreDraft(editor.findDraft()!)
      expect(editor.save()).toEqual({ status: 'conflict' })
    })
  })
})
