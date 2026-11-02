import { beforeEach, describe, expect, it } from 'vitest'
import {
  backupRaw,
  draftKey,
  listDraftIds,
  loadDraft,
  loadNotes,
  NOTES_KEY,
  readNotes,
  removeDraft,
  saveDraft,
  saveNotes,
  SCHEMA_VERSION,
} from './storage'
import type { Note } from '../model/types'

const note: Note = {
  id: 'n1',
  title: 'Title',
  todos: [{ id: 't1', text: 'Item', done: false }],
  createdAt: 1,
  updatedAt: 2,
}

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('stores notes together with the schema version', () => {
    saveNotes(localStorage, [note])
    expect(JSON.parse(localStorage.getItem(NOTES_KEY)!)).toEqual({ version: SCHEMA_VERSION, notes: [note] })
    expect(loadNotes(localStorage)).toEqual([note])
  })

  it('reports missing, corrupted and unknown future data', () => {
    expect(readNotes(null)).toEqual({ notes: [], status: 'ok' })
    expect(readNotes('{not json')).toEqual({ notes: [], status: 'corrupted' })
    expect(readNotes('[]')).toEqual({ notes: [], status: 'corrupted' })
    expect(readNotes(JSON.stringify({ version: SCHEMA_VERSION + 1, notes: [note] })))
      .toEqual({ notes: [], status: 'unsupported-version' })
  })

  it('skips malformed notes and reports them', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION, notes: [note, { id: 1 }] })
    expect(readNotes(raw)).toEqual({ notes: [note], status: 'corrupted' })
  })

  it('backs up a raw value once', () => {
    const key = backupRaw(localStorage, '{broken')
    expect(key).not.toBeNull()
    expect(localStorage.getItem(key!)).toBe('{broken')
    expect(backupRaw(localStorage, '{broken')).toBe(key)
  })

  it('stores drafts per note and lists them', () => {
    const draft = {
      noteId: 'n1',
      baseUpdatedAt: 2,
      content: { title: 'Edited', todos: [] },
      history: { past: [], future: [] },
      savedAt: 3,
    }
    saveDraft(localStorage, 'n1', draft)
    saveDraft(localStorage, 'new:tab', { ...draft, noteId: null, baseUpdatedAt: null })

    expect(loadDraft(localStorage, 'n1')).toEqual({ version: SCHEMA_VERSION, ...draft })
    expect(listDraftIds(localStorage).sort()).toEqual(['n1', 'new:tab'])

    removeDraft(localStorage, 'n1')
    expect(loadDraft(localStorage, 'n1')).toBeNull()
  })

  it('ignores malformed drafts', () => {
    localStorage.setItem(draftKey('n1'), JSON.stringify({ version: SCHEMA_VERSION, content: 'x' }))
    expect(loadDraft(localStorage, 'n1')).toBeNull()
  })
})
