<script setup lang="ts">
import { computed } from 'vue'
import CoverageGauge from '@/features/schedule/CoverageGauge.vue'
import { personName, shortDate } from '@/lib/subjects'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

const props = defineProps<{ model: Modello; result: ScheduleResult; colours: Map<string, string> }>()

const cards = computed(() =>
  Object.values(props.model.classi).map((classe) => {
    const days = props.result.calendario.giorni.filter(
      (day) => day.data >= classe.dataInizio && day.data <= classe.dataFine
    )
    const lessons = props.result.lezioni.filter((lesson) => lesson.classe === classe.id)
    const lastDay = [...new Set(lessons.map((lesson) => lesson.data))].sort().at(-1) ?? ''
    return {
      ...classe,
      giorniUtili: days.length,
      ore: lessons.length,
      // The window is a deadline, not a target: a course that finishes early is a correct result.
      ultimoGiorno: lastDay,
      oreAlGiorno: days.length > 0 ? lessons.length / days.length : 0,
      copertura: props.result.copertura.filter((row) => row.classe === classe.id),
      titolari: props.result.titolari.filter((t) => t.classe === classe.id),
    }
  })
)
</script>

<template>
  <div class="grid gap-3 lg:grid-cols-3">
    <section
      v-for="card in cards"
      :key="card.id"
      class="space-y-3 border border-line-strong bg-panel p-3"
    >
      <div class="flex items-baseline justify-between">
        <span class="legend text-[12px]">{{ card.id }}</span>
        <span class="font-mono text-[9.5px] text-ink-soft">aula {{ card.aulaCasa }}</span>
      </div>

      <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 border-y border-line py-2 font-mono text-[10px]">
        <dt class="text-ink-soft">finestra</dt>
        <dd>{{ shortDate(card.dataInizio) }} → {{ shortDate(card.dataFine) }}</dd>
        <dt class="text-ink-soft">giorni utili</dt>
        <dd>{{ card.giorniUtili }}</dd>
        <dt class="text-ink-soft">ore</dt>
        <dd>{{ card.ore }}</dd>
        <dt class="text-ink-soft">media al giorno</dt>
        <dd>{{ card.oreAlGiorno.toFixed(2) }} h</dd>
        <dt class="text-ink-soft">giornata</dt>
        <dd>{{ card.oreGiornoMin }}–{{ card.oreGiornoMax }} h</dd>
        <dt class="text-ink-soft">ultima lezione</dt>
        <dd>{{ card.ultimoGiorno ? shortDate(card.ultimoGiorno) : '—' }}</dd>
      </dl>

      <div class="space-y-1.5">
        <CoverageGauge
          v-for="row in card.copertura"
          :key="row.materia"
          :row="row"
          :colour="colours.get(row.materia) ?? 'var(--subject-1)'"
        />
      </div>

      <ul class="space-y-0.5 border-t border-line pt-2">
        <li
          v-for="assignment in card.titolari"
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
</template>
