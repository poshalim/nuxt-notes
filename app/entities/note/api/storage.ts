import type { HistoryState } from '~/shared/lib'
import type { NoteOp } from '../model/ops'
import type { Note, NoteContent, TodoItem } from '../model/types'

export const SCHEMA_VERSION = 1
export const NOTES_KEY = 'nuxt-notes:notes'
export const DRAFT_KEY_PREFIX = 'nuxt-notes:draft:'
/** Drafts of not yet saved notes are keyed by this prefix and the id of the tab's edit session. */
export const NEW_NOTE_DRAFT_PREFIX = 'new:'
/** sessionStorage key with the id of the new-note session of the current tab. */
export const NEW_NOTE_SESSION_KEY = 'nuxt-notes:new-note-session'
export const BACKUP_KEY_PREFIX = 'nuxt-notes:backup:'

/** `ok` also covers missing data; the other statuses mean the stored value could not be fully read. */
export type NotesReadStatus = 'ok' | 'corrupted' | 'unsupported-version'

export interface NotesReadResult {
  notes: Note[]
  status: NotesReadStatus
}

export interface PersistedNotes {
  version: number
  notes: Note[]
}

export interface NoteDraft {
  version: number
  /** `null` for a note that has not been saved yet. */
  noteId: string | null
  /** `updatedAt` of the stored note the draft was based on. */
  baseUpdatedAt: number | null
  content: NoteContent
  history: HistoryState<NoteOp>
  savedAt: number
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>

/**
 * `migrations[n]` upgrades data of version `n` to version `n + 1`.
 * Add an entry here together with bumping `SCHEMA_VERSION`.
 */
const migrations: Record<number, Migration> = {}

export function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  }
  catch {
    return null
  }
}

export function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  }
  catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTodo(value: unknown): value is TodoItem {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.text === 'string'
    && typeof value.done === 'boolean'
}

function isContent(value: unknown): value is NoteContent {
  return isRecord(value)
    && typeof value.title === 'string'
    && Array.isArray(value.todos)
    && value.todos.every(isTodo)
}

function isNote(value: unknown): value is Note {
  return isContent(value)
    && typeof (value as unknown as Note).id === 'string'
    && typeof (value as unknown as Note).createdAt === 'number'
    && typeof (value as unknown as Note).updatedAt === 'number'
}

function migrate(data: Record<string, unknown>): Record<string, unknown> | null {
  let current = data
  let version = typeof current.version === 'number' ? current.version : 0
  if (version > SCHEMA_VERSION) return null
  while (version < SCHEMA_VERSION) {
    const step = migrations[version]
    if (!step) return null
    current = step(current)
    version += 1
  }
  return { ...current, version }
}

function readJson(storage: Storage, key: string): Record<string, unknown> | null {
  const raw = storage.getItem(key)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : null
  }
  catch {
    return null
  }
}

function writeRaw(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value)
    return true
  }
  catch (error) {
    console.error(`[storage] failed to write "${key}"`, error)
    return false
  }
}

function writeJson(storage: Storage, key: string, value: unknown): boolean {
  return writeRaw(storage, key, JSON.stringify(value))
}

export function readNotes(raw: string | null): NotesReadResult {
  if (raw === null) return { notes: [], status: 'ok' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return { notes: [], status: 'corrupted' }
  }
  if (!isRecord(parsed)) return { notes: [], status: 'corrupted' }
  if (typeof parsed.version === 'number' && parsed.version > SCHEMA_VERSION) {
    return { notes: [], status: 'unsupported-version' }
  }
  const data = migrate(parsed)
  if (!data || !Array.isArray(data.notes)) return { notes: [], status: 'corrupted' }
  const notes = data.notes.filter(isNote)
  return { notes, status: notes.length === data.notes.length ? 'ok' : 'corrupted' }
}

export function loadNotes(storage: Storage): Note[] {
  return readNotes(storage.getItem(NOTES_KEY)).notes
}

function listKeys(storage: Storage, prefix: string): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(prefix)) keys.push(key)
  }
  return keys
}

/**
 * Copies an unreadable stored value to a separate key, so overwriting the notes never loses it.
 * Returns the backup key, or `null` if the backup could not be written.
 */
export function backupRaw(storage: Storage, raw: string): string | null {
  const existing = listKeys(storage, BACKUP_KEY_PREFIX).find(key => storage.getItem(key) === raw)
  if (existing) return existing
  const key = BACKUP_KEY_PREFIX + Date.now()
  return writeRaw(storage, key, raw) ? key : null
}

export function saveNotes(storage: Storage, notes: Note[]): boolean {
  const data: PersistedNotes = { version: SCHEMA_VERSION, notes }
  return writeJson(storage, NOTES_KEY, data)
}

/** `draftId` is the note id, or `NEW_NOTE_DRAFT_PREFIX` + session id for a note that is not saved yet. */
export function draftKey(draftId: string): string {
  return DRAFT_KEY_PREFIX + draftId
}

export function loadDraft(storage: Storage, draftId: string): NoteDraft | null {
  const parsed = readJson(storage, draftKey(draftId))
  if (!parsed) return null
  const data = migrate(parsed)
  if (
    !data
    || !isContent(data.content)
    || !isRecord(data.history)
    || !Array.isArray(data.history.past)
    || !Array.isArray(data.history.future)
  ) {
    return null
  }
  return data as unknown as NoteDraft
}

export function saveDraft(storage: Storage, draftId: string, draft: Omit<NoteDraft, 'version'>): boolean {
  return writeJson(storage, draftKey(draftId), { version: SCHEMA_VERSION, ...draft })
}

export function removeDraft(storage: Storage, draftId: string): void {
  storage.removeItem(draftKey(draftId))
}

export function listDraftIds(storage: Storage): string[] {
  return listKeys(storage, DRAFT_KEY_PREFIX).map(key => key.slice(DRAFT_KEY_PREFIX.length))
}
