<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import CoverageGauge from '@/features/schedule/CoverageGauge.vue'
import TimetableBoard from '@/features/schedule/TimetableBoard.vue'
import TitleBlock from '@/features/schedule/TitleBlock.vue'
import WeekSpine from '@/features/schedule/WeekSpine.vue'
import { railLayout } from '@/features/schedule/geometry'
import { useScheduleGenerator } from '@/composables/useScheduleGenerator'
import { personName, subjectColours } from '@/lib/subjects'
import dataset from '../data/dataset-demo.json'
import closures from '../data/chiusure.json'

const { result, running, failure, dataProblems, generate } = useScheduleGenerator()
const week = ref(0)

const slots = dataset.configurazione.slot
const lunchSlot = dataset.configurazione.pausa_pranzo
const usableSlots = slots.map((_, i) => i).filter((i) => slots[i] !== lunchSlot)
const layout = railLayout(slots, usableSlots, lunchSlot)

const classes = Object.keys(dataset.classi)
const colours = subjectColours(Object.keys(dataset.corsi))
const homeRooms = Object.fromEntries(
  Object.entries(dataset.classi).map(([name, info]) => [name, info.aula_casa])
)
// The engine already reports how many hours each class-subject needs: asking the dataset again
// would be the same fact stated twice, and the two could drift apart.
const requiredHours = computed(() =>
  (result.value?.copertura ?? []).reduce((total, row) => total + row.oreRichieste, 0)
)

const calendar = computed(() => result.value?.calendario)
const period = computed(() => {
  const days = calendar.value?.giorni ?? []
  return { from: days[0]?.data ?? '', to: days[days.length - 1]?.data ?? '', total: days.length }
})
const weekDays = computed(() =>
  (calendar.value?.giorni ?? []).filter((day) => day.settimana === week.value)
)
const weekLessons = computed(() => {
  const dates = new Set(weekDays.value.map((day) => day.data))
  return (result.value?.lezioni ?? []).filter((lesson) => dates.has(lesson.data))
})

const weekSummaries = computed(() => {
  const days = calendar.value?.giorni ?? []
  const lessons = result.value?.lezioni ?? []
  return Array.from({ length: calendar.value?.numeroSettimane ?? 0 }, (_, index) => {
    const ofWeek = days.filter((day) => day.settimana === index)
    const dates = new Set(ofWeek.map((day) => day.data))
    return {
      index,
      days: ofWeek.length,
      hours: lessons.filter((lesson) => dates.has(lesson.data)).length,
      firstDate: ofWeek[0]?.data ?? '',
    }
  })
})

const closedDays = computed(() => calendar.value?.esclusi ?? [])

onMounted(() => generate(dataset, closures))
</script>

<template>
  <div class="min-h-screen px-4 py-3">
    <header class="mb-3 flex items-center gap-3">
      <h1 class="legend text-[13px]">Quadro orario</h1>
      <span class="font-mono text-[10px] text-ink-soft">centro di formazione professionale</span>
      <Button class="ml-auto" :disabled="running" @click="generate(dataset, closures)">
        {{ running ? 'Genero…' : 'Rigenera' }}
      </Button>
    </header>

    <div v-if="running" class="border border-line-strong bg-panel p-10 text-center">
      <p class="legend text-[11px]">incastro in corso</p>
      <p class="mt-1 font-mono text-[10px] text-ink-soft">
        Il motore gira in un worker: la pagina resta viva.
      </p>
    </div>

    <div v-else-if="failure" class="border border-fault bg-panel p-5">
      <p class="legend text-[11px] text-fault">generazione fallita</p>
      <p class="mt-1 text-[12px]">{{ failure }}</p>
      <ul v-if="dataProblems.length" class="mt-3 space-y-1 font-mono text-[10px] text-ink-soft">
        <li v-for="problem in dataProblems" :key="problem">— {{ problem }}</li>
      </ul>
    </div>

    <div v-else-if="result" class="space-y-3">
      <TitleBlock
        :from="period.from"
        :to="period.to"
        :week="week"
        :weeks="calendar?.numeroSettimane ?? 0"
        :scheduled="result.lezioni.length"
        :required="requiredHours"
        :working-days="period.total"
        :unresolved="result.settimaneNonRisolte.length"
        :seconds="result.millisecondi / 1000"
      />

      <WeekSpine :weeks="weekSummaries" :current="week" @select="week = $event" />

      <TimetableBoard
        :lessons="weekLessons"
        :days="weekDays"
        :classes="classes"
        :home-rooms="homeRooms"
        :layout="layout"
        :colours="colours"
        :slots="slots"
      />

      <div class="grid gap-3 md:grid-cols-3">
        <section
          v-for="className in classes"
          :key="className"
          class="border border-line-strong bg-panel p-3"
        >
          <div class="mb-2 flex items-baseline justify-between">
            <span class="legend text-[10px]">{{ className }}</span>
            <span class="font-mono text-[9.5px] text-ink-soft">
              aula {{ homeRooms[className] }}
            </span>
          </div>
          <div class="space-y-1.5">
            <CoverageGauge
              v-for="row in result.copertura.filter((c) => c.classe === className)"
              :key="row.materia"
              :row="row"
              :colour="colours.get(row.materia) ?? 'var(--subject-1)'"
            />
          </div>
          <ul class="mt-3 space-y-0.5 border-t border-line pt-2">
            <li
              v-for="assignment in result.titolari.filter((t) => t.classe === className)"
              :key="assignment.materia"
              class="flex items-center gap-1.5 font-mono text-[9.5px] text-ink-soft"
            >
              <span
                class="h-2 w-0.5 shrink-0"
                :style="{ background: colours.get(assignment.materia) }"
                aria-hidden="true"
              />
              <span class="truncate">{{ personName(assignment.docente) }}</span>
            </li>
          </ul>
        </section>
      </div>

      <p v-if="closedDays.length" class="font-mono text-[10px] text-ink-soft">
        chiusure nel periodo:
        {{ closedDays.map((d) => `${d.data} (${d.motivo})`).join(' · ') }}
      </p>
    </div>
  </div>
</template>
