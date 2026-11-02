<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '#imports'
import { TodoItemRow } from '~/features/edit-note'
import { AppBanner, BaseButton, EmptyState } from '~/shared/ui'
import { useNoteEditorFlows } from '../model/useNoteEditorFlows'
import { useRowFocus } from '../model/useRowFocus'

const { setRowRef, focusRow, addItemAt, onTitleKeydown, onRemoveEmpty, onNavigate } = useRowFocus()
const { editor, status, save, remove, cancel, loadLatest } = useNoteEditorFlows({ focusTitle: () => focusRow() })

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

    <form v-else-if="status === 'ready'" class="editor" novalidate @submit.prevent="save()">
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
          <BaseButton v-if="!editor.isNew" variant="ghost" icon="trash" compact @click="remove">
            Удалить
          </BaseButton>
          <BaseButton @click="cancel">
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
          <BaseButton size="sm" variant="primary" @click="save({ asNew: true })">
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
