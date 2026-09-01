<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import AppTabs from '@/features/shell/AppTabs.vue'
import ClassesPage from '@/features/classes/ClassesPage.vue'
import CoursesPage from '@/features/courses/CoursesPage.vue'
import RoomsPage from '@/features/rooms/RoomsPage.vue'
import SchedulePage from '@/features/schedule/SchedulePage.vue'
import TeachersPage from '@/features/teachers/TeachersPage.vue'
import { useHashRoute } from '@/composables/useHashRoute'
import { useScheduleGenerator } from '@/composables/useScheduleGenerator'
import { model, modelProblems, rawClosures, rawDataset } from '@/data/source'
import { subjectColours } from '@/lib/subjects'

const TABS = [
  { id: 'orario', label: 'orario' },
  { id: 'docenti', label: 'docenti' },
  { id: 'corsi', label: 'corsi' },
  { id: 'classi', label: 'classi' },
  { id: 'aule', label: 'aule' },
] as const

// Widened to string on purpose: AppTabs writes back into this model, and a union type would
// make it read-only from the component's side.
const TAB_IDS: string[] = TABS.map((entry) => entry.id)
const tab = useHashRoute(TAB_IDS, 'orario')

const { result, running, failure, dataProblems, generate } = useScheduleGenerator()

const colours = computed(() => subjectColours(model ? Object.keys(model.materie) : []))
const blockingProblems = computed(() => (modelProblems.length ? modelProblems : dataProblems.value))

onMounted(() => generate(rawDataset, rawClosures))
</script>

<template>
  <div class="min-h-screen px-4 py-3">
    <header class="mb-2 flex flex-wrap items-center gap-3">
      <h1 class="legend text-[13px]">Quadro orario</h1>
      <span class="font-mono text-[10px] text-ink-soft">centro di formazione professionale</span>
      <Button class="ml-auto" :disabled="running" @click="generate(rawDataset, rawClosures)">
        {{ running ? 'Genero…' : 'Rigenera' }}
      </Button>
    </header>

    <AppTabs v-model="tab" :tabs="TABS" />

    <main class="pt-3">
      <div v-if="running" class="border border-line-strong bg-panel p-10 text-center">
        <p class="legend text-[11px]">incastro in corso</p>
        <p class="mt-1 font-mono text-[10px] text-ink-soft">
          Il motore gira in un worker: la pagina resta viva.
        </p>
      </div>

      <div v-else-if="failure || !model" class="border border-fault bg-panel p-5">
        <p class="legend text-[11px] text-fault">generazione fallita</p>
        <p class="mt-1 text-[12px]">{{ failure ?? 'I dati di ingresso non sono validi.' }}</p>
        <ul v-if="blockingProblems.length" class="mt-3 space-y-1 font-mono text-[10px] text-ink-soft">
          <li v-for="problem in blockingProblems" :key="problem">— {{ problem }}</li>
        </ul>
      </div>

      <template v-else-if="result && model">
        <SchedulePage v-if="tab === 'orario'" :model="model" :result="result" :colours="colours" />
        <TeachersPage v-else-if="tab === 'docenti'" :model="model" :result="result" :colours="colours" />
        <CoursesPage v-else-if="tab === 'corsi'" :model="model" :result="result" :colours="colours" />
        <ClassesPage v-else-if="tab === 'classi'" :model="model" :result="result" :colours="colours" />
        <RoomsPage v-else-if="tab === 'aule'" :model="model" :result="result" :colours="colours" />
      </template>
    </main>
  </div>
</template>
