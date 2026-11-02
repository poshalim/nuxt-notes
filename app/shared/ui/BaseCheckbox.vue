<script setup lang="ts">
import AppIcon from './AppIcon.vue'
defineProps<{
  checked: boolean
  label: string
  /** Renders a non-interactive indicator instead of a form control. */
  readonly?: boolean
}>()

defineEmits<{ toggle: [] }>()
</script>

<template>
  <span v-if="readonly" class="checkbox checkbox--readonly" :class="{ 'checkbox--checked': checked }">
    <span class="checkbox__box" aria-hidden="true">
      <AppIcon v-if="checked" name="check" :size="14" />
    </span>
    <span class="visually-hidden">{{ checked ? 'Выполнено' : 'Не выполнено' }}</span>
  </span>
  <label v-else class="checkbox" :class="{ 'checkbox--checked': checked }">
    <input
      class="checkbox__input visually-hidden"
      type="checkbox"
      :checked="checked"
      :aria-label="label"
      @change="$emit('toggle')"
    >
    <span class="checkbox__box" aria-hidden="true">
      <AppIcon v-if="checked" name="check" :size="14" />
    </span>
  </label>
</template>

<style scoped lang="scss">
.checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  cursor: pointer;

  &--readonly {
    width: 20px;
    height: 20px;
    cursor: default;
  }

  &__box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: 2px solid var(--c-border-strong);
    border-radius: 6px;
    background: var(--c-surface);
    color: var(--c-on-primary);
    transition: background-color $transition, border-color $transition;
  }

  &--checked &__box {
    background: var(--c-primary);
    border-color: var(--c-primary);
  }

  &:not(&--readonly):hover &__box {
    border-color: var(--c-primary);
  }

  &__input:focus-visible + &__box {
    @include focus-ring;
  }
}
</style>
