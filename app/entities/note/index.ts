export type { Note, NoteContent, TodoItem } from './model/types'
export { cloneContent, cloneTodo, contentEquals, emptyContent, isContentEmpty, normalizeContent } from './model/content'
export { applyOp, invertOp, type NoteOp } from './model/ops'
export { PERSIST_DELAY, useNotesStore, type StorageIssue } from './model/store'
export {
  draftKey,
  getStorage,
  listDraftIds,
  loadDraft,
  NEW_NOTE_DRAFT_ID,
  removeDraft,
  saveDraft,
  type NoteDraft,
} from './api/storage'
export { default as NoteCard } from './ui/NoteCard.vue'
