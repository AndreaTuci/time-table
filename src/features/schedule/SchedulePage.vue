<script setup lang="ts">
import { computed, ref } from 'vue'
import FilterSwitches from './FilterSwitches.vue'
import TimetableBoard from './TimetableBoard.vue'
import TitleBlock from './TitleBlock.vue'
import WeekSpine from './WeekSpine.vue'
import { railLayout } from './geometry'
import type { BoardDay, ScheduleResult } from './types'
import type { Modello } from '@/engine/types'

const props = defineProps<{ model: Modello; result: ScheduleResult; colours: Map<string, string> }>()

const week = ref(0)
const classes = Object.keys(props.model.classi)
const subjects = Object.keys(props.model.materie)

/*
 * Two filters that behave differently on purpose. Hiding a subject DIMS its hours, because an
 * hour that vanished would read as a free hour and the class is in fact busy. Hiding a class
 * REMOVES its column, because a column that is not drawn claims nothing about anybody.
 */
const visibleSubjects = ref<string[]>([...subjects])
const visibleClasses = ref<string[]>([...classes])

const layout = railLayout(props.model.slot, props.model.slotUtili, props.model.pausaPranzo)
const homeRooms = Object.fromEntries(
  Object.values(props.model.classi).map((classe) => [classe.id, classe.aulaCasa])
)

const calendar = computed(() => props.result.calendario)
const weekDays = computed(() => calendar.value.giorni.filter((day) => day.settimana === week.value))

/**
 * The week's columns: teaching days and closures together, in weekday order. A closure left out
 * would turn the week of the 1st of November into an ordinary-looking four-day week, with hours
 * missing for no visible reason.
 */
const boardDays = computed<BoardDay[]>(() => {
  const teaching = weekDays.value.map((day) => ({ data: day.data, indiceGiorno: day.indiceGiorno }))
  const closed = calendar.value.esclusi
    .filter((day) => day.settimana === week.value)
    .map((day) => ({ data: day.data, indiceGiorno: day.indiceGiorno, closedFor: day.motivo }))
  return [...teaching, ...closed].sort((a, b) => a.indiceGiorno - b.indiceGiorno)
})

const weekLessons = computed(() => {
  const dates = new Set(weekDays.value.map((day) => day.data))
  return props.result.lezioni.filter((lesson) => dates.has(lesson.data))
})

const weekSummaries = computed(() =>
  Array.from({ length: calendar.value.numeroSettimane }, (_, index) => {
    const ofWeek = calendar.value.giorni.filter((day) => day.settimana === index)
    const dates = new Set(ofWeek.map((day) => day.data))
    return {
      index,
      days: ofWeek.length,
      hours: props.result.lezioni.filter((lesson) => dates.has(lesson.data)).length,
      firstDate: ofWeek[0]?.data ?? '',
    }
  })
)

const requiredHours = computed(() =>
  props.result.copertura.reduce((total, row) => total + row.oreRichieste, 0)
)
const period = computed(() => {
  const days = calendar.value.giorni
  return { from: days[0]?.data ?? '', to: days[days.length - 1]?.data ?? '', total: days.length }
})
</script>

<template>
  <div class="space-y-3">
    <TitleBlock
      :from="period.from"
      :to="period.to"
      :week="week"
      :weeks="calendar.numeroSettimane"
      :scheduled="result.lezioni.length"
      :required="requiredHours"
      :working-days="period.total"
      :unresolved="result.settimaneNonRisolte.length"
      :seconds="result.millisecondi / 1000"
    />

    <WeekSpine :weeks="weekSummaries" :current="week" @select="week = $event" />

    <div class="space-y-1.5 border border-line-strong bg-panel px-3 py-2">
      <FilterSwitches v-model="visibleClasses" label="classi" :items="classes" />
      <FilterSwitches v-model="visibleSubjects" label="materie" :items="subjects" :colours="colours" />
    </div>

    <TimetableBoard
      v-if="visibleClasses.length"
      :lessons="weekLessons"
      :days="boardDays"
      :classes="visibleClasses"
      :class-count="classes.length"
      :home-rooms="homeRooms"
      :layout="layout"
      :colours="colours"
      :slots="model.slot"
      :visible-subjects="visibleSubjects"
    />
    <p v-else class="border border-line-strong bg-panel px-3 py-8 text-center text-[11px] text-ink-soft">
      Nessuna classe selezionata. Riaccendine una qui sopra per vedere la settimana.
    </p>

    <p v-if="calendar.esclusi.length" class="font-mono text-[10px] text-ink-soft">
      chiusure nel periodo:
      {{ calendar.esclusi.map((day) => `${day.data} — ${day.motivo}`).join(' · ') }}
    </p>
  </div>
</template>
