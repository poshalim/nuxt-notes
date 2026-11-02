<script setup lang="ts">
import { DialogHost } from '~/features/confirm-dialog'
import { ToastHost } from '~/shared/ui'
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <DialogHost />
  <ToastHost />
</template>
