import { beforeEach, describe, expect, it } from 'vitest'
import {
  draftKey,
  listDraftIds,
  loadDraft,
  loadNotes,
  NOTES_KEY,
  removeDraft,
  saveDraft,
  saveNotes,
  SCHEMA_VERSION,
} from '~/lib/storage'
import type { Note } from '~/lib/types'

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

  it('returns no notes for missing, corrupted or unknown future data', () => {
    expect(loadNotes(localStorage)).toEqual([])
    localStorage.setItem(NOTES_KEY, '{not json')
    expect(loadNotes(localStorage)).toEqual([])
    localStorage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, notes: [note] }))
    expect(loadNotes(localStorage)).toEqual([])
  })

  it('skips malformed notes', () => {
    localStorage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION, notes: [note, { id: 1 }] }))
    expect(loadNotes(localStorage)).toEqual([note])
  })

  it('stores drafts per note and lists them', () => {
    const draft = {
      noteId: 'n1',
      baseUpdatedAt: 2,
      content: { title: 'Edited', todos: [] },
      history: { past: [], future: [] },
      savedAt: 3,
    }
    saveDraft(localStorage, draft)
    saveDraft(localStorage, { ...draft, noteId: null, baseUpdatedAt: null })

    expect(loadDraft(localStorage, 'n1')).toEqual({ version: SCHEMA_VERSION, ...draft })
    expect(listDraftIds(localStorage).sort()).toEqual(['n1', 'new'])

    removeDraft(localStorage, 'n1')
    expect(loadDraft(localStorage, 'n1')).toBeNull()
  })

  it('ignores malformed drafts', () => {
    localStorage.setItem(draftKey('n1'), JSON.stringify({ version: SCHEMA_VERSION, content: 'x' }))
    expect(loadDraft(localStorage, 'n1')).toBeNull()
  })
})
