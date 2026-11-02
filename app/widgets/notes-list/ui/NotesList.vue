<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useHead } from '#imports'
import { getStorage, listDraftIds, loadDraft, NEW_NOTE_DRAFT_PREFIX, NoteCard, useNotesStore, type Note } from '~/entities/note'
import { useDialog } from '~/features/confirm-dialog'
import { plural, useToast } from '~/shared/lib'
import { AppBanner, BaseButton, EmptyState } from '~/shared/ui'

useHead({ title: 'Заметки' })

const notesStore = useNotesStore()
const { confirm } = useDialog()
const toast = useToast()

const draftIds = ref(new Set<string>())
/** Sessions of unsaved new notes, the most recent first. */
const newNoteSessions = ref<string[]>([])

function refreshDrafts() {
  const storage = getStorage()
  const ids = storage ? listDraftIds(storage) : []
  draftIds.value = new Set(ids)
  newNoteSessions.value = ids
    .filter(id => id.startsWith(NEW_NOTE_DRAFT_PREFIX))
    .map(id => ({ id, savedAt: (storage && loadDraft(storage, id)?.savedAt) || 0 }))
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(draft => draft.id.slice(NEW_NOTE_DRAFT_PREFIX.length))
}

onMounted(() => {
  refreshDrafts()
  window.addEventListener('storage', refreshDrafts)
})
onBeforeUnmount(() => window.removeEventListener('storage', refreshDrafts))

const storageIssueText = computed(() => {
  const issue = notesStore.storageIssue
  if (!issue) return null
  const reason = issue.status === 'unsupported-version'
    ? 'Сохранённые данные созданы более новой версией приложения и не загружены.'
    : 'Часть сохранённых данных повреждена и не загружена.'
  const backup = issue.backupKey
    ? `Исходные данные сохранены в localStorage под ключом «${issue.backupKey}».`
    : 'Резервную копию создать не удалось, поэтому изменения не сохраняются.'
  return `${reason} ${backup}`
})

const newDraftText = computed(() => {
  const count = newNoteSessions.value.length
  if (count === 0) return null
  if (count === 1) return 'У вас есть несохранённая новая заметка.'
  return `У вас ${count} ${plural(count, ['несохранённая новая заметка', 'несохранённые новые заметки', 'несохранённых новых заметок'])}.`
})

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

    <AppBanner v-if="storageIssueText" class="home__banner">
      {{ storageIssueText }}
      <template #actions>
        <BaseButton size="sm" @click="notesStore.dismissStorageIssue()">
          Понятно
        </BaseButton>
      </template>
    </AppBanner>

    <AppBanner v-else-if="notesStore.persistFailed" class="home__banner">
      Не удалось сохранить изменения: хранилище браузера недоступно или переполнено.
    </AppBanner>

    <AppBanner v-if="newDraftText" variant="info" class="home__banner">
      {{ newDraftText }}
      <template #actions>
        <BaseButton :to="`/notes/new?draft=${newNoteSessions[0]}`" size="sm">
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
    grid-template-columns: minmax(0, 1fr);
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
