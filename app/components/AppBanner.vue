<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'warning' | 'info' }>(), { variant: 'warning' })
</script>

<template>
  <div class="banner" :class="`banner--${variant}`" role="status">
    <AppIcon name="alert" class="banner__icon" />
    <div class="banner__text">
      <slot />
    </div>
    <div v-if="$slots.actions" class="banner__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 12px 16px;
  border: 1px solid var(--c-border);
  border-radius: $radius;
  background: var(--c-surface);
  font-size: 14px;

  &--warning {
    background: var(--c-warning-soft);
    border-color: var(--c-warning-border);
  }

  &--info {
    background: var(--c-primary-soft);
    border-color: transparent;
  }

  &__icon {
    color: var(--c-text-muted);
  }

  &__text {
    flex: 1 1 240px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
