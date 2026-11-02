<script setup lang="ts">
import { NoteEditor } from '~/widgets/note-editor'

// Keep one page instance when the URL of a just created note changes from /notes/new to /notes/<id>.
definePageMeta({ key: 'note-editor' })
</script>

<template>
  <NoteEditor />
</template>
