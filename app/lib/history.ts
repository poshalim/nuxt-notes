export const HISTORY_LIMIT = 50

export interface HistoryState<T> {
  past: T[]
  future: T[]
}

export function createHistory<T>(): HistoryState<T> {
  return { past: [], future: [] }
}

/** Records a new entry: drops the redo branch and evicts the oldest entries beyond the limit. */
export function pushEntry<T>(history: HistoryState<T>, entry: T, limit = HISTORY_LIMIT): void {
  history.past.push(entry)
  if (history.past.length > limit) {
    history.past.splice(0, history.past.length - limit)
  }
  history.future.length = 0
}

/** Moves the latest entry to the redo stack and returns it so the caller can revert it. */
export function takeUndo<T>(history: HistoryState<T>): T | undefined {
  const entry = history.past.pop()
  if (entry !== undefined) history.future.push(entry)
  return entry
}

/** Moves the latest undone entry back to the past and returns it so the caller can re-apply it. */
export function takeRedo<T>(history: HistoryState<T>): T | undefined {
  const entry = history.future.pop()
  if (entry !== undefined) history.past.push(entry)
  return entry
}

export function clearHistory<T>(history: HistoryState<T>): void {
  history.past.length = 0
  history.future.length = 0
}
