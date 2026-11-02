<script setup lang="ts">
import { ref } from 'vue'
import type { TodoItem } from '~/entities/note'
import { BaseButton, BaseCheckbox } from '~/shared/ui'

const props = defineProps<{ item: TodoItem, index: number }>()

const emit = defineEmits<{
  'toggle': []
  'update:text': [value: string]
  'commit': []
  'remove': []
  'enter': []
  'remove-empty': []
  'navigate': [direction: -1 | 1]
}>()

const input = ref<HTMLInputElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('enter')
  }
  else if (event.key === 'Backspace' && props.item.text === '') {
    event.preventDefault()
    emit('remove-empty')
  }
  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    emit('navigate', event.key === 'ArrowUp' ? -1 : 1)
  }
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <li class="todo-row" :class="{ 'todo-row--done': item.done }">
    <BaseCheckbox
      :checked="item.done"
      :label="`Выполнено: ${item.text || `пункт ${index + 1}`}`"
      @toggle="emit('toggle')"
    />
    <input
      ref="input"
      class="todo-row__input"
      type="text"
      :value="item.text"
      placeholder="Что нужно сделать?"
      :aria-label="`Пункт ${index + 1}`"
      enterkeyhint="next"
      @input="emit('update:text', ($event.target as HTMLInputElement).value)"
      @blur="emit('commit')"
      @keydown="onKeydown"
    >
    <BaseButton
      class="todo-row__remove"
      variant="ghost"
      size="sm"
      icon="trash"
      icon-only
      :label="`Удалить пункт ${index + 1}`"
      @click="emit('remove')"
    />
  </li>
</template>

<style scoped lang="scss">
.todo-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: $radius;
  transition: background-color $transition;

  &:hover,
  &:focus-within {
    background: var(--c-surface-muted);
  }

  &__input {
    flex: 1;
    min-width: 0;
    padding: 8px 6px;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    font-size: 16px;

    &::placeholder {
      color: var(--c-text-muted);
      opacity: 0.7;
    }

    &:focus-visible {
      outline: none;
    }
  }

  &--done &__input {
    color: var(--c-text-muted);
    text-decoration: line-through;
  }

  &__remove {
    opacity: 0;

    .todo-row:hover &,
    .todo-row:focus-within & {
      opacity: 1;
    }

    @media (hover: none) {
      opacity: 1;
    }
  }
}
</style>
