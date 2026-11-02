<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import AppIcon, { type IconName } from './AppIcon.vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: IconName
  /** Shows only the icon; the label is still used as the accessible name and tooltip. */
  iconOnly?: boolean
  /** Hides the label on narrow screens. */
  compact?: boolean
  label?: string
  to?: RouteLocationRaw
  type?: 'button' | 'submit'
  disabled?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  icon: undefined,
  label: undefined,
  to: undefined,
  type: 'button',
})

const hideLabel = computed(() => props.iconOnly && props.icon)
</script>

<template>
  <NuxtLink
    v-if="to && !disabled"
    :to="to"
    class="base-button"
    :class="[`base-button--${variant}`, `base-button--${size}`, { 'base-button--icon-only': hideLabel, 'base-button--compact': compact }]"
    :aria-label="hideLabel ? label : undefined"
    :title="hideLabel ? label : undefined"
  >
    <AppIcon v-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <span v-if="!hideLabel" class="base-button__label"><slot>{{ label }}</slot></span>
  </NuxtLink>
  <button
    v-else
    :type="type"
    class="base-button"
    :class="[`base-button--${variant}`, `base-button--${size}`, { 'base-button--icon-only': hideLabel, 'base-button--compact': compact }]"
    :disabled="disabled"
    :aria-label="hideLabel ? label : undefined"
    :title="hideLabel ? label : undefined"
  >
    <AppIcon v-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <span v-if="!hideLabel" class="base-button__label"><slot>{{ label }}</slot></span>
  </button>
</template>

<style scoped lang="scss">
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: $radius;
  font-weight: 600;
  font-size: 15px;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  transition: background-color $transition, border-color $transition, color $transition, box-shadow $transition;
  -webkit-tap-highlight-color: transparent;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &--sm {
    min-height: 32px;
    padding: 0 12px;
    font-size: 14px;
    border-radius: $radius-sm;
  }

  &--icon-only {
    padding: 0;
    width: 40px;

    &.base-button--sm {
      width: 32px;
    }
  }

  &--compact {
    @include down(sm) {
      padding: 0;
      width: 40px;

      .base-button__label {
        @include visually-hidden;
      }
    }
  }

  &--primary {
    background: var(--c-primary);
    color: var(--c-on-primary);
    box-shadow: var(--shadow-sm);

    &:hover:not(:disabled) {
      background: var(--c-primary-hover);
    }
  }

  &--secondary {
    background: var(--c-surface);
    border-color: var(--c-border);
    color: var(--c-text);

    &:hover:not(:disabled) {
      border-color: var(--c-border-strong);
      background: var(--c-surface-muted);
    }
  }

  &--ghost {
    background: transparent;
    color: var(--c-text-muted);

    &:hover:not(:disabled) {
      background: var(--c-surface-muted);
      color: var(--c-text);
    }
  }

  &--danger {
    background: var(--c-danger);
    color: #fff;

    &:hover:not(:disabled) {
      background: var(--c-danger-hover);
    }
  }
}
</style>
