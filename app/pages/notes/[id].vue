<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

// Keep one page instance when the URL of a just created note changes from /notes/new to /notes/<id>.
definePageMeta({ key: 'note-editor' })

const route = useRoute()
const router = useRouter()
const editor = useEditorStore()
const dialog = useDialog()
const toast = useToast()

const routeId = computed(() => String(route.params.id))
const status = ref<'loading' | 'ready' | 'not-found'>('loading')
/** Skips the unsaved-changes guard for navigations the page starts itself. */
let leaving = false

const titleInput = ref<HTMLInputElement | null>(null)
const rows = new Map<string, { focus: () => void }>()

function setRowRef(id: string, el: unknown) {
  if (el) rows.set(id, el as { focus: () => void })
  else rows.delete(id)
}

const doneCount = computed(() => editor.content.todos.filter(item => item.done).length)
const statusText = computed(() => {
  if (editor.isDirty) return 'Не сохранено'
  return editor.isNew ? 'Новая заметка' : 'Сохранено'
})

useHead({
  title: () => {
    if (status.value === 'not-found') return 'Заметка не найдена'
    if (editor.isNew) return 'Новая заметка'
    return editor.content.title || 'Без названия'
  },
})

async function focusRow(id: string | undefined) {
  await nextTick()
  if (id) rows.get(id)?.focus()
  else titleInput.value?.focus()
}

async function offerDraft() {
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

async function init() {
  const id = routeId.value === 'new' ? null : routeId.value
  // A new note has just been saved and the URL updated: keep the current session.
  if (id !== null && editor.active && editor.noteId === id) {
    status.value = 'ready'
    return
  }
  if (editor.active) editor.close()
  if (editor.open(id) === 'not-found') {
    status.value = 'not-found'
    return
  }
  status.value = 'ready'
  await offerDraft()
  if (editor.isNew) focusRow(undefined)
}

watch(routeId, init, { immediate: true })

function addItemAt(index: number) {
  focusRow(editor.addItem(index))
}

function onTitleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.isComposing) return
  event.preventDefault()
  const first = editor.content.todos[0]
  if (first) focusRow(first.id)
  else addItemAt(0)
}

function onRemoveEmpty(index: number) {
  const previous = editor.content.todos[index - 1]
  editor.removeItem(editor.content.todos[index]!.id)
  focusRow(previous?.id)
}

function onNavigate(index: number, direction: -1 | 1) {
  const target = editor.content.todos[index + direction]
  if (target) focusRow(target.id)
  else if (direction === -1) focusRow(undefined)
}

async function leaveTo(path: string) {
  leaving = true
  try {
    await router.push(path)
  }
  finally {
    leaving = false
  }
}

async function onSave(options: { force?: boolean, asNew?: boolean } = {}) {
  const wasNew = editor.isNew
  const result = editor.save(options)
  switch (result.status) {
    case 'saved':
      toast.show('Заметка сохранена', 'success')
      if (wasNew || options.asNew) {
        leaving = true
        await router.replace(`/notes/${result.id}`)
        leaving = false
      }
      break
    case 'empty':
      toast.show('Добавьте название или хотя бы один пункт', 'error')
      focusRow(undefined)
      break
    case 'conflict':
      await resolveConflict()
      break
    case 'deleted':
      await promptRemoved()
      break
  }
}

async function loadLatest() {
  if (editor.isDirty) {
    const confirmed = await dialog.confirm({
      title: 'Загрузить актуальную версию?',
      message: 'Ваши несохранённые изменения будут потеряны.',
      confirmLabel: 'Загрузить',
      danger: true,
    })
    if (!confirmed) return
  }
  editor.discardDraft()
  editor.open(editor.noteId)
}

async function resolveConflict() {
  const choice = await dialog.choose({
    title: 'Заметка изменена в другой вкладке',
    message: 'Пока вы редактировали, эту заметку сохранили в другом месте. Какую версию оставить?',
    actions: [
      { id: 'cancel', label: 'Отмена', autofocus: true },
      { id: 'theirs', label: 'Загрузить их версию' },
      { id: 'mine', label: 'Перезаписать моей', variant: 'danger' },
    ],
  })
  if (choice === 'mine') await onSave({ force: true })
  else if (choice === 'theirs') {
    editor.discardDraft()
    editor.open(editor.noteId)
  }
}

let removedPromptOpen = false

async function promptRemoved() {
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
  if (choice === 'save') await onSave({ asNew: true })
  else if (choice === 'leave') await leaveTo('/')
}

watch(() => editor.isRemovedExternally, (removed) => {
  if (removed && !leaving) promptRemoved()
})

async function onDelete() {
  const confirmed = await dialog.confirm({
    title: 'Удалить заметку?',
    message: `«${editor.content.title || 'Без названия'}» будет удалена без возможности восстановления.`,
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!confirmed || editor.noteId === null) return
  leaving = true
  useNotesStore().remove(editor.noteId)
  editor.close()
  toast.show('Заметка удалена')
  await router.push('/')
  leaving = false
}

/** The unsaved-changes guard below asks for confirmation when needed. */
function onCancel() {
  router.push('/')
}

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

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS' && !dialog.isOpen.value) {
    event.preventDefault()
    if (status.value === 'ready') onSave()
  }
}

function onPageHide() {
  editor.flushDraft()
}

function onVisibilityChange() {
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
</script>

<template>
  <div class="container editor-page">
    <EmptyState
      v-if="status === 'not-found'"
      icon="alert"
      title="Заметка не найдена"
      text="Возможно, её удалили или в ссылке ошибка."
    >
      <BaseButton to="/" variant="primary" icon="arrow-left">
        К списку заметок
      </BaseButton>
    </EmptyState>

    <form v-else-if="status === 'ready'" class="editor" novalidate @submit.prevent="onSave()">
      <div class="editor__toolbar">
        <BaseButton to="/" variant="ghost" icon="arrow-left" compact>
          Все заметки
        </BaseButton>
        <div class="editor__history" role="group" aria-label="История изменений">
          <BaseButton
            variant="ghost"
            icon="undo"
            icon-only
            label="Отменить (Ctrl+Z)"
            :disabled="!editor.canUndo"
            @click="editor.undo()"
          />
          <BaseButton
            variant="ghost"
            icon="redo"
            icon-only
            label="Повторить (Ctrl+Shift+Z)"
            :disabled="!editor.canRedo"
            @click="editor.redo()"
          />
        </div>
        <span class="editor__status" :class="{ 'editor__status--dirty': editor.isDirty }">
          {{ statusText }}
        </span>
        <div class="editor__actions">
          <BaseButton v-if="!editor.isNew" variant="ghost" icon="trash" compact @click="onDelete">
            Удалить
          </BaseButton>
          <BaseButton @click="onCancel">
            Отмена
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            icon="save"
            compact
            :disabled="!editor.isDirty && !editor.isRemovedExternally"
          >
            Сохранить
          </BaseButton>
        </div>
      </div>

      <AppBanner v-if="editor.isRemovedExternally" class="editor__banner">
        Эту заметку удалили в другой вкладке.
        <template #actions>
          <BaseButton size="sm" variant="primary" @click="onSave({ asNew: true })">
            Сохранить как новую
          </BaseButton>
        </template>
      </AppBanner>
      <AppBanner v-else-if="editor.isChangedExternally" class="editor__banner">
        Эту заметку изменили в другой вкладке.
        <template #actions>
          <BaseButton size="sm" @click="loadLatest">
            Загрузить актуальную версию
          </BaseButton>
        </template>
      </AppBanner>

      <section class="editor__card">
        <label class="visually-hidden" for="note-title">Название заметки</label>
        <input
          id="note-title"
          ref="titleInput"
          class="editor__title"
          type="text"
          :value="editor.content.title"
          placeholder="Без названия"
          autocomplete="off"
          enterkeyhint="next"
          @input="editor.setTitle(($event.target as HTMLInputElement).value)"
          @blur="editor.commitText()"
          @keydown="onTitleKeydown"
        >

        <p v-if="editor.content.todos.length" class="editor__progress">
          Выполнено {{ doneCount }} из {{ editor.content.todos.length }}
        </p>

        <ul v-if="editor.content.todos.length" class="editor__todos" aria-label="Список задач">
          <TodoItemRow
            v-for="(item, index) in editor.content.todos"
            :key="item.id"
            :ref="(el) => setRowRef(item.id, el)"
            :item="item"
            :index="index"
            @toggle="editor.toggleItem(item.id)"
            @update:text="editor.setItemText(item.id, $event)"
            @commit="editor.commitText()"
            @remove="editor.removeItem(item.id)"
            @enter="addItemAt(index + 1)"
            @remove-empty="onRemoveEmpty(index)"
            @navigate="onNavigate(index, $event)"
          />
        </ul>

        <BaseButton class="editor__add" variant="ghost" icon="plus" @click="addItemAt(editor.content.todos.length)">
          Добавить пункт
        </BaseButton>
      </section>

      <p class="editor__hint">
        <kbd>Enter</kbd> — новый пункт, <kbd>Backspace</kbd> в пустом пункте — удалить его,
        <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Shift+Z</kbd> — отменить / повторить, <kbd>Ctrl+S</kbd> — сохранить.
        Пустые пункты при сохранении удаляются.
      </p>
    </form>
  </div>
</template>

<style scoped lang="scss">
.editor-page {
  max-width: $editor-width + 48px;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: -8px -8px 0;
    padding: 8px;
    border-radius: $radius-lg;
    background: var(--c-bg);
    background: color-mix(in srgb, var(--c-bg) 88%, transparent);
    backdrop-filter: blur(8px);
  }

  &__history {
    display: flex;
    gap: 2px;
  }

  &__status {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--c-text-muted);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--dirty {
      color: var(--c-text);
    }

    @include down(md) {
      @include visually-hidden;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px 16px;
    border: 1px solid var(--c-border);
    border-radius: $radius-lg;
    background: var(--c-surface);
    box-shadow: var(--shadow-sm);

    @include up(sm) {
      padding: 28px 28px 20px;
    }
  }

  &__title {
    width: 100%;
    padding: 4px 8px;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;

    &::placeholder {
      color: var(--c-text-muted);
      opacity: 0.6;
    }

    &:focus-visible {
      outline: none;
      background: var(--c-surface-muted);
    }

    @include up(sm) {
      font-size: 28px;
    }
  }

  &__progress {
    padding: 0 8px;
    color: var(--c-text-muted);
    font-size: 14px;
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__add {
    align-self: flex-start;
  }

  &__hint {
    color: var(--c-text-muted);
    font-size: 13px;

    @media (hover: none) {
      display: none;
    }

    kbd {
      padding: 1px 6px;
      border: 1px solid var(--c-border);
      border-radius: 4px;
      background: var(--c-surface);
      font-family: inherit;
      font-size: 12px;
    }
  }
}
</style>
