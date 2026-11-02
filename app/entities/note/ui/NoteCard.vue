<script setup lang="ts">
import { formatDate, plural } from '~/shared/lib'
import { BaseButton, BaseCheckbox } from '~/shared/ui'
import type { Note } from '../model/types'

const PREVIEW_SIZE = 3

const props = defineProps<{ note: Note, hasDraft?: boolean }>()
defineEmits<{ delete: [] }>()

const preview = computed(() => props.note.todos.slice(0, PREVIEW_SIZE))
const hiddenCount = computed(() => props.note.todos.length - preview.value.length)
const doneCount = computed(() => props.note.todos.filter(item => item.done).length)
const progress = computed(() => props.note.todos.length ? doneCount.value / props.note.todos.length : 0)
const editLink = computed(() => `/notes/${props.note.id}`)
const titleText = computed(() => props.note.title || 'Без названия')
</script>

<template>
  <article class="note-card">
    <header class="note-card__header">
      <h2 class="note-card__title" :class="{ 'note-card__title--empty': !note.title }">
        <NuxtLink :to="editLink" class="note-card__link">
          {{ titleText }}
        </NuxtLink>
      </h2>
      <span v-if="hasDraft" class="note-card__badge">Черновик</span>
    </header>

    <ul v-if="preview.length" class="note-card__todos" :aria-label="`Задачи: ${note.todos.length}`">
      <li
        v-for="item in preview"
        :key="item.id"
        class="note-card__todo"
        :class="{ 'note-card__todo--done': item.done }"
      >
        <BaseCheckbox :checked="item.done" :label="item.text" readonly />
        <span class="note-card__todo-text">{{ item.text }}</span>
      </li>
    </ul>
    <p v-else class="note-card__placeholder">
      Нет пунктов
    </p>
    <p v-if="hiddenCount > 0" class="note-card__more">
      и ещё {{ hiddenCount }} {{ plural(hiddenCount, ['пункт', 'пункта', 'пунктов']) }}
    </p>

    <footer class="note-card__footer">
      <div v-if="note.todos.length" class="note-card__progress">
        <span class="note-card__progress-bar" aria-hidden="true">
          <span :style="{ width: `${progress * 100}%` }" />
        </span>
        <span class="note-card__progress-text">{{ doneCount }}/{{ note.todos.length }}</span>
      </div>
      <time class="note-card__date" :datetime="new Date(note.updatedAt).toISOString()">
        {{ formatDate(note.updatedAt) }}
      </time>
      <div class="note-card__actions">
        <BaseButton
          :to="editLink"
          variant="ghost"
          size="sm"
          icon="edit"
          icon-only
          :label="`Изменить «${titleText}»`"
        />
        <BaseButton
          variant="ghost"
          size="sm"
          icon="trash"
          icon-only
          :label="`Удалить «${titleText}»`"
          @click="$emit('delete')"
        />
      </div>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.note-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  padding: 20px;
  border: 1px solid var(--c-border);
  border-radius: $radius-lg;
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  transition: box-shadow $transition, border-color $transition, transform $transition;

  &:hover {
    border-color: var(--c-border-strong);
    box-shadow: var(--shadow);
  }

  // Keyboard focus only: focus restored after a mouse-driven dialog must not highlight the card.
  &:has(:focus-visible) {
    border-color: var(--c-primary);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  &__title {
    flex: 1;
    min-width: 0;
    font-size: 18px;
    line-height: 1.35;
    overflow-wrap: anywhere;
    @include line-clamp(2);

    &--empty {
      color: var(--c-text-muted);
      font-style: italic;
    }
  }

  &__link {
    text-decoration: none;

    &:focus-visible {
      outline: none;
    }

    // Makes the whole card clickable without nesting interactive elements.
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }
  }

  &__badge {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--c-warning-soft);
    border: 1px solid var(--c-warning-border);
    font-size: 12px;
    font-weight: 600;
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__todo {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    font-size: 15px;

    &--done .note-card__todo-text {
      color: var(--c-text-muted);
      text-decoration: line-through;
    }
  }

  &__todo-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__placeholder,
  &__more {
    color: var(--c-text-muted);
    font-size: 14px;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: auto;
    padding-top: 8px;
    font-size: 13px;
    color: var(--c-text-muted);
  }

  &__progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__progress-bar {
    display: block;
    width: 48px;
    height: 6px;
    border-radius: 3px;
    background: var(--c-surface-muted);
    overflow: hidden;

    span {
      display: block;
      height: 100%;
      background: var(--c-success);
    }
  }

  &__date {
    margin-right: auto;
  }

  &__actions {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 4px;
  }
}
</style>
