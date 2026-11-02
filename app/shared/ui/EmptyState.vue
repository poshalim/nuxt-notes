<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue'

defineProps<{ icon?: IconName, title: string, text?: string }>()
</script>

<template>
  <section class="empty-state">
    <div class="empty-state__icon">
      <AppIcon :name="icon ?? 'note'" :size="32" />
    </div>
    <h2 class="empty-state__title">
      {{ title }}
    </h2>
    <p v-if="text" class="empty-state__text">
      {{ text }}
    </p>
    <div v-if="$slots.default" class="empty-state__actions">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 16px;
  text-align: center;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--c-primary-soft);
    color: var(--c-primary);
  }

  &__title {
    font-size: 20px;
  }

  &__text {
    max-width: 420px;
    color: var(--c-text-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
  }
}
</style>
