export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface NoteContent {
  title: string
  todos: TodoItem[]
}

export interface Note extends NoteContent {
  id: string
  createdAt: number
  updatedAt: number
}
