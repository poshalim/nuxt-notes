<script setup lang="ts">
import { getStorage, listDraftIds, NEW_NOTE_DRAFT_ID } from '~/lib/storage'
import type { Note } from '~/lib/types'
import { useNotesStore } from '~/stores/notes'

useHead({ title: 'Заметки' })

const notesStore = useNotesStore()
const { confirm } = useDialog()
const toast = useToast()

const draftIds = ref(new Set<string>())

function refreshDrafts() {
  const storage = getStorage()
  draftIds.value = new Set(storage ? listDraftIds(storage) : [])
}

onMounted(() => {
  refreshDrafts()
  window.addEventListener('storage', refreshDrafts)
})
onBeforeUnmount(() => window.removeEventListener('storage', refreshDrafts))

const hasNewDraft = computed(() => draftIds.value.has(NEW_NOTE_DRAFT_ID))

async function onDelete(note: Note) {
  const confirmed = await confirm({
    title: 'Удалить заметку?',
    message: `«${note.title || 'Без названия'}» будет удалена без возможности восстановления.`,
    confirmLabel: 'Удалить',
    danger: true,
  })
  if (!confirmed) return
  notesStore.remove(note.id)
  refreshDrafts()
  toast.show('Заметка удалена')
}
</script>

<template>
  <div class="container home">
    <div class="home__head">
      <div>
        <h1 class="home__title">
          Мои заметки
        </h1>
        <p v-if="notesStore.notes.length" class="home__count">
          {{ notesStore.notes.length }} {{ plural(notesStore.notes.length, ['заметка', 'заметки', 'заметок']) }}
        </p>
      </div>
      <BaseButton to="/notes/new" variant="primary" icon="plus" compact>
        Новая заметка
      </BaseButton>
    </div>

    <AppBanner v-if="hasNewDraft" variant="info" class="home__banner">
      У вас есть несохранённая новая заметка.
      <template #actions>
        <BaseButton to="/notes/new" size="sm">
          Продолжить
        </BaseButton>
      </template>
    </AppBanner>

    <ul v-if="notesStore.sortedNotes.length" class="home__grid">
      <li v-for="note in notesStore.sortedNotes" :key="note.id">
        <NoteCard :note="note" :has-draft="draftIds.has(note.id)" @delete="onDelete(note)" />
      </li>
    </ul>

    <EmptyState
      v-else
      title="Заметок пока нет"
      text="Создайте первую заметку и добавьте в неё список задач."
    >
      <BaseButton to="/notes/new" variant="primary" icon="plus">
        Создать заметку
      </BaseButton>
    </EmptyState>
  </div>
</template>

<style scoped lang="scss">
.home {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
  }

  &__title {
    font-size: 26px;
    line-height: 1.2;

    @include up(sm) {
      font-size: 30px;
    }
  }

  &__count {
    margin-top: 4px;
    color: var(--c-text-muted);
    font-size: 14px;
  }

  &__banner {
    margin-bottom: 20px;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @include up(sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include up(md) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }

    > li {
      display: flex;
      flex-direction: column;

      > * {
        flex: 1;
      }
    }
  }
}
</style>
