<script setup lang="ts">
import { useToast } from '../lib'
import AppIcon from './AppIcon.vue'
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.variant}`"
      >
        <span class="toast__message">{{ toast.message }}</span>
        <button type="button" class="toast__close" aria-label="Скрыть уведомление" @click="dismiss(toast.id)">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.toasts {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;

  @include up(sm) {
    left: auto;
    align-items: flex-end;
  }
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 420px;
  padding: 10px 10px 10px 16px;
  border-radius: $radius;
  background: var(--c-text);
  color: var(--c-bg);
  box-shadow: var(--shadow);
  font-size: 14px;
  pointer-events: auto;

  &--error {
    background: var(--c-danger);
    color: #fff;
  }

  &__close {
    display: inline-flex;
    padding: 4px;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    color: inherit;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
