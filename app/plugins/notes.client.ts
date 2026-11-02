import { defineNuxtPlugin } from '#imports'
import { useNotesStore } from '~/entities/note'

export default defineNuxtPlugin(() => {
  const store = useNotesStore()
  store.hydrate()
  store.startSync()
})
