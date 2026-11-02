<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  /** Closing by Escape or a click on the backdrop. */
  dismissible?: boolean
}>(), { dismissible: true })

const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)
const isOpen = toRef(props, 'open')
const titleId = useId()
const bodyId = useId()

useFocusTrap(dialog, isOpen)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.dismissible) {
    event.stopPropagation()
    emit('close')
  }
}

watch(isOpen, (open) => {
  document.documentElement.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal" @keydown="onKeydown">
        <div class="modal__backdrop" aria-hidden="true" @click="dismissible && emit('close')" />
        <div
          ref="dialog"
          class="modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="$slots.default ? bodyId : undefined"
          tabindex="-1"
        >
          <header class="modal__header">
            <h2 :id="titleId" class="modal__title">
              {{ title }}
            </h2>
            <button
              v-if="dismissible"
              type="button"
              class="modal__close"
              aria-label="Закрыть"
              @click="emit('close')"
            >
              <AppIcon name="close" />
            </button>
          </header>
          <div v-if="$slots.default" :id="bodyId" class="modal__body">
            <slot />
          </div>
          <footer v-if="$slots.actions" class="modal__actions">
            <slot name="actions" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;

  @include down(sm) {
    align-items: flex-end;
    padding: 0;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background: var(--c-backdrop);
  }

  &__dialog {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 460px;
    max-height: calc(100dvh - 32px);
    overflow: auto;
    padding: 24px;
    border-radius: $radius-lg;
    background: var(--c-surface);
    box-shadow: var(--shadow-lg);

    &:focus {
      outline: none;
    }

    @include down(sm) {
      max-width: none;
      border-radius: $radius-lg $radius-lg 0 0;
      padding: 20px 16px calc(16px + env(safe-area-inset-bottom));
    }
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  &__title {
    flex: 1;
    font-size: 19px;
    line-height: 1.3;
  }

  &__close {
    display: inline-flex;
    margin: -6px -6px 0 0;
    padding: 6px;
    border: 0;
    border-radius: $radius-sm;
    background: transparent;
    color: var(--c-text-muted);

    &:hover {
      background: var(--c-surface-muted);
      color: var(--c-text);
    }
  }

  &__body {
    color: var(--c-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;

    @include down(sm) {
      flex-direction: column-reverse;

      > :deep(*) {
        width: 100%;
      }
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 160ms ease;

  .modal__dialog {
    transition: transform 160ms ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal__dialog {
    transform: translateY(12px) scale(0.98);
  }
}
</style>
