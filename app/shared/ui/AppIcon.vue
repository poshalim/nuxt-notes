<script setup lang="ts">
const paths = {
  'plus': 'M12 5v14M5 12h14',
  'trash': 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  'edit': 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  'undo': 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  'redo': 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  'check': 'm5 12 5 5 9-10',
  'close': 'M6 6l12 12M18 6 6 18',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'alert': 'M12 9v4M12 17h.01M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z',
  'note': 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h7M9 17h5',
  'save': 'M5 3h11l4 4v14H4V3zM8 3v5h7M8 21v-7h8v7',
} as const

export type IconName = keyof typeof paths

defineProps<{ name: IconName, size?: number }>()
</script>

<template>
  <svg
    class="app-icon"
    :width="size ?? 20"
    :height="size ?? 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name]" />
  </svg>
</template>

<style scoped lang="scss">
.app-icon {
  flex-shrink: 0;
}
</style>
