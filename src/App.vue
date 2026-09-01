<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import AppTabs from '@/features/shell/AppTabs.vue'
import ClassesPage from '@/features/classes/ClassesPage.vue'
import CoursesPage from '@/features/courses/CoursesPage.vue'
import RoomsPage from '@/features/rooms/RoomsPage.vue'
import SchedulePage from '@/features/schedule/SchedulePage.vue'
import TeachersPage from '@/features/teachers/TeachersPage.vue'
import { useHashRoute } from '@/composables/useHashRoute'
import { useScheduleGenerator } from '@/composables/useScheduleGenerator'
import {
  datasetForWorker,
  edited,
  modelState,
  resetToExample,
  revision,
  storageAvailable,
} from '@/data/store'
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

/** Revision the current schedule was built from: anything newer makes it stale, not wrong. */
const builtFrom = ref(-1)
const stale = computed(() => !!result.value && builtFrom.value !== revision.value)

const model = computed(() => modelState.value.model)
const colours = computed(() => subjectColours(model.value ? Object.keys(model.value.materie) : []))
const blockingProblems = computed(() =>
  modelState.value.problems.length ? modelState.value.problems : dataProblems.value
)

function run() {
  builtFrom.value = revision.value
  const { data, closures } = datasetForWorker()
  generate(data, closures)
}

onMounted(run)
</script>

<template>
  <div class="min-h-screen px-4 py-3">
    <header class="mb-2 flex flex-wrap items-center gap-3">
      <h1 class="legend text-[13px]">Quadro orario</h1>
      <span class="font-mono text-[10px] text-ink-soft">centro di formazione professionale</span>
      <div class="ml-auto flex items-center gap-2">
        <Button v-if="edited" variant="ghost" size="sm" @click="resetToExample()">
          ripristina i dati di esempio
        </Button>
        <Button :variant="stale ? 'active' : 'default'" :disabled="running" @click="run">
          {{ running ? 'Genero…' : 'Rigenera' }}
        </Button>
      </div>
    </header>

    <AppTabs v-model="tab" :tabs="TABS" />

    <p
      v-if="stale && !running"
      class="mt-2 border border-caution bg-panel px-3 py-1.5 font-mono text-[10.5px] text-caution"
      role="status"
    >
      I dati sono cambiati: l'orario qui sotto è stato generato prima delle tue modifiche.
    </p>
    <p
      v-if="!storageAvailable"
      class="mt-2 border border-line-strong bg-panel px-3 py-1.5 font-mono text-[10.5px] text-ink-soft"
    >
      Il browser non consente di salvare: le modifiche valgono solo per questa sessione.
    </p>

    <main class="pt-3">
      <div v-if="running" class="border border-line-strong bg-panel p-10 text-center">
        <p class="legend text-[11px]">incastro in corso</p>
        <p class="mt-1 font-mono text-[10px] text-ink-soft">
          Il motore gira in un worker: la pagina resta viva.
        </p>
      </div>

      <div v-else-if="failure || !model" class="border border-fault bg-panel p-5">
        <p class="legend text-[11px] text-fault">
          {{ model ? 'generazione fallita' : 'dati non validi' }}
        </p>
        <p class="mt-1 text-[12px]">
          {{ failure ?? 'Le modifiche hanno reso i dati incoerenti.' }}
        </p>
        <ul v-if="blockingProblems.length" class="mt-3 space-y-1 font-mono text-[10px] text-ink-soft">
          <li v-for="problem in blockingProblems" :key="problem">— {{ problem }}</li>
        </ul>
        <Button class="mt-4" @click="resetToExample()">ripristina i dati di esempio</Button>
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
