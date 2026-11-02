<script setup lang="ts">
import { BaseButton, EmptyState } from '~/shared/ui'
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const isNotFound = computed(() => props.error.statusCode === 404)

useHead({ title: isNotFound.value ? 'Страница не найдена' : 'Ошибка' })
</script>

<template>
  <NuxtLayout>
    <div class="container">
      <EmptyState
        icon="alert"
        :title="isNotFound ? 'Страница не найдена' : 'Что-то пошло не так'"
        :text="isNotFound ? 'Возможно, ссылка устарела или в ней опечатка.' : error.message"
      >
        <BaseButton variant="primary" icon="arrow-left" @click="clearError({ redirect: '/' })">
          К списку заметок
        </BaseButton>
      </EmptyState>
    </div>
  </NuxtLayout>
</template>
