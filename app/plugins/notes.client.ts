import { useNotesStore } from '~/stores/notes'

export default defineNuxtPlugin(() => {
  const store = useNotesStore()
  store.hydrate()
  store.startSync()
})
