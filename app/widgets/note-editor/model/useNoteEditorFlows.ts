import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from '#imports'
import { useNotesStore } from '~/entities/note'
import { useDialog } from '~/features/confirm-dialog'
import { useEditorStore } from '~/features/edit-note'
import { formatDate, useToast, useUndoHotkeys } from '~/shared/lib'

export type EditorPageStatus = 'loading' | 'ready' | 'not-found'

interface FlowOptions {
  /** Moves focus to the title, e.g. when an empty note cannot be saved. */
  focusTitle: () => void
}

/**
 * User flows of the editor page that combine the editor store with routing and dialogs:
 * opening by route, draft restore, save with conflict/deletion resolution, delete,
 * the unsaved-changes guard, hotkeys and flushing the draft when the tab is hidden.
 */
export function useNoteEditorFlows({ focusTitle }: FlowOptions) {
  const route = useRoute()
  const router = useRouter()
  const editor = useEditorStore()
  const dialog = useDialog()
  const toast = useToast()

  const routeId = computed(() => String(route.params.id))
  const status = ref<EditorPageStatus>('loading')
  /** Skips the unsaved-changes guard for navigations the page starts itself. */
  let leaving = false
  let removedPromptOpen = false

  async function navigate(action: () => Promise<unknown>): Promise<void> {
    leaving = true
    try {
      await action()
    }
    finally {
      leaving = false
    }
  }

  async function offerDraft(): Promise<void> {
    const draft = editor.findDraft()
    if (!draft) return
    const choice = await dialog.choose({
      title: 'Восстановить несохранённые изменения?',
      message: `Найдены изменения от ${formatDate(draft.savedAt)}, которые не были сохранены.`,
      actions: [
        { id: 'discard', label: 'Отбросить' },
        { id: 'restore', label: 'Восстановить', variant: 'primary', autofocus: true },
      ],
    })
    if (choice === 'restore') editor.restoreDraft(draft)
    else if (choice === 'discard') editor.discardDraft()
  }

  async function init(): Promise<void> {
    const id = routeId.value === 'new' ? null : routeId.value
    // A new note has just been saved and the URL updated: keep the current session.
    if (id !== null && editor.active && editor.noteId === id) {
      status.value = 'ready'
      return
    }
    if (editor.active) editor.close()
    const draft = typeof route.query.draft === 'string' ? route.query.draft : undefined
    if (editor.open(id, { draft }) === 'not-found') {
      status.value = 'not-found'
      return
    }
    status.value = 'ready'
    await offerDraft()
    if (editor.isNew) focusTitle()
  }

  async function save(options: { force?: boolean, asNew?: boolean } = {}): Promise<void> {
    const wasNew = editor.isNew
    const result = editor.save(options)
    switch (result.status) {
      case 'saved':
        toast.show('Заметка сохранена', 'success')
        if (wasNew || options.asNew) await navigate(() => router.replace(`/notes/${result.id}`))
        break
      case 'empty':
        toast.show('Добавьте название или хотя бы один пункт', 'error')
        focusTitle()
        break
      case 'conflict':
        await resolveConflict()
        break
      case 'deleted':
        await promptRemoved()
        break
    }
  }

  function reloadStored(): void {
    editor.discardDraft()
    editor.open(editor.noteId)
  }

  async function loadLatest(): Promise<void> {
    if (editor.isDirty) {
      const confirmed = await dialog.confirm({
        title: 'Загрузить актуальную версию?',
        message: 'Ваши несохранённые изменения будут потеряны.',
        confirmLabel: 'Загрузить',
        danger: true,
      })
      if (!confirmed) return
    }
    reloadStored()
  }

  async function resolveConflict(): Promise<void> {
    const choice = await dialog.choose({
      title: 'Заметка изменена в другой вкладке',
      message: 'Пока вы редактировали, эту заметку сохранили в другом месте. Какую версию оставить?',
      actions: [
        { id: 'cancel', label: 'Отмена', autofocus: true },
        { id: 'theirs', label: 'Загрузить их версию' },
        { id: 'mine', label: 'Перезаписать моей', variant: 'danger' },
      ],
    })
    if (choice === 'mine') await save({ force: true })
    else if (choice === 'theirs') reloadStored()
  }

  async function promptRemoved(): Promise<void> {
    if (removedPromptOpen) return
    removedPromptOpen = true
    const choice = await dialog.choose({
      title: 'Заметка удалена',
      message: 'Эту заметку удалили в другой вкладке. Вы можете сохранить свою версию как новую заметку.',
      actions: [
        { id: 'leave', label: 'Закрыть без сохранения' },
        { id: 'save', label: 'Сохранить как новую', variant: 'primary', autofocus: true },
      ],
    })
    removedPromptOpen = false
    if (choice === 'save') await save({ asNew: true })
    else if (choice === 'leave') await navigate(() => router.push('/'))
  }

  async function remove(): Promise<void> {
    const confirmed = await dialog.confirm({
      title: 'Удалить заметку?',
      message: `«${editor.content.title || 'Без названия'}» будет удалена без возможности восстановления.`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    const id = editor.noteId
    if (!confirmed || id === null) return
    await navigate(async () => {
      useNotesStore().remove(id)
      editor.close()
      toast.show('Заметка удалена')
      await router.push('/')
    })
  }

  /** The unsaved-changes guard asks for confirmation when needed. */
  function cancel(): void {
    router.push('/')
  }

  watch(routeId, init, { immediate: true })

  watch(() => editor.isRemovedExternally, (removed) => {
    if (removed && !leaving) promptRemoved()
  })

  onBeforeRouteLeave(async () => {
    if (leaving || !editor.active || !editor.isDirty) return true
    const confirmed = await dialog.confirm({
      title: 'Отменить редактирование?',
      message: 'Несохранённые изменения будут потеряны.',
      confirmLabel: 'Отменить изменения',
      cancelLabel: 'Продолжить',
      danger: true,
    })
    if (confirmed) editor.cancel()
    return confirmed
  })

  useUndoHotkeys({
    undo: () => editor.undo(),
    redo: () => editor.redo(),
    enabled: () => status.value === 'ready' && !dialog.isOpen.value,
  })

  function onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS' && !dialog.isOpen.value) {
      event.preventDefault()
      if (status.value === 'ready') save()
    }
  }

  function onPageHide(): void {
    editor.flushDraft()
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') editor.flushDraft()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('pagehide', onPageHide)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    editor.close()
  })

  return { editor, status, save, remove, cancel, loadLatest }
}
