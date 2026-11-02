<script setup lang="ts">
const { current, resolveCurrent } = useDialog()

const autofocusId = computed(() => {
  const actions = current.value?.actions ?? []
  return (actions.find(action => action.autofocus) ?? actions[0])?.id
})
</script>

<template>
  <AppModal
    :open="current !== null"
    :title="current?.title ?? ''"
    @close="resolveCurrent(null)"
  >
    <template v-if="current?.message" #default>
      <p>{{ current.message }}</p>
    </template>
    <template #actions>
      <BaseButton
        v-for="action in current?.actions"
        :key="action.id"
        :variant="action.variant ?? 'secondary'"
        :data-autofocus="action.id === autofocusId ? '' : undefined"
        @click="resolveCurrent(action.id)"
      >
        {{ action.label }}
      </BaseButton>
    </template>
  </AppModal>
</template>
