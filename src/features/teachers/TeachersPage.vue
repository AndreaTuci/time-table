<script setup lang="ts">
import { computed, ref } from 'vue'
import WeekUsageGrid from '@/features/insights/WeekUsageGrid.vue'
import { teacherLoads, weeklyUsage } from '@/features/insights/workload'
import { railLayout } from '@/features/schedule/geometry'
import { personName } from '@/lib/subjects'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

const props = defineProps<{
  model: Modello
  result: ScheduleResult
  colours: Map<string, string>
}>()

const selected = ref(props.model.docenti[0]?.id ?? '')

const weeks = computed(() => props.result.calendario.numeroSettimane)
const layout = computed(() => railLayout(props.model.slot, props.model.slotUtili, props.model.pausaPranzo))
const loads = computed(() => teacherLoads(props.model, props.result, weeks.value))
const current = computed(() => loads.value.find((load) => load.id === selected.value))
const teacher = computed(() => props.model.docenti.find((d) => d.id === selected.value))

const usage = computed(() =>
  weeklyUsage(props.result.lezioni.filter((lesson) => lesson.docente === selected.value))
)

/** Share of the declared availability that the schedule actually uses. */
const saturation = (oreSettimanali: number, oreDisponibili: number) =>
  oreDisponibili === 0 ? 0 : Math.round((oreSettimanali / oreDisponibili) * 100)
</script>

<template>
  <div class="grid gap-3 lg:grid-cols-[17rem_1fr] items-start">
    <ul class="divide-y divide-line border border-line-strong bg-panel">
      <li v-for="load in loads" :key="load.id">
        <button
          type="button"
          class="w-full px-3 py-2 text-left transition-colors"
          :class="load.id === selected ? 'bg-signal/10' : 'hover:bg-sunken'"
          :aria-current="load.id === selected ? 'true' : undefined"
          @click="selected = load.id"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="truncate text-[11.5px] font-semibold">{{ personName(load.nome) }}</span>
            <span class="shrink-0 font-mono text-[9.5px] text-ink-soft">
              {{ saturation(load.oreSettimanali, load.oreDisponibili) }}%
            </span>
          </div>
          <p class="truncate font-mono text-[9.5px] text-ink-soft">{{ load.materie.join(' · ') }}</p>
          <div class="mt-1 h-1 w-full bg-sunken">
            <div
              class="h-full"
              :class="saturation(load.oreSettimanali, load.oreDisponibili) > 90 ? 'bg-caution' : 'bg-signal'"
              :style="{ width: `${Math.min(saturation(load.oreSettimanali, load.oreDisponibili), 100)}%` }"
            />
          </div>
        </button>
      </li>
    </ul>

    <section v-if="current && teacher" class="space-y-3">
      <div class="flex flex-wrap items-stretch divide-x divide-line border border-line-strong bg-panel">
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">docente</p>
          <p class="text-[13px] font-semibold">{{ personName(current.nome) }}</p>
        </div>
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">disponibili</p>
          <p class="font-mono text-[12px]">{{ current.oreDisponibili }} h/sett</p>
        </div>
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">impegnate</p>
          <p class="font-mono text-[12px]">{{ current.oreSettimanali.toFixed(1) }} h/sett</p>
        </div>
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">totale corso</p>
          <p class="font-mono text-[12px]">{{ current.oreAssegnate }} h</p>
        </div>
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">incarichi</p>
          <p class="font-mono text-[12px]">
            <template v-if="current.incarichi.length">
              {{ current.incarichi.map((i) => `${i.classe}/${i.materia}`).join(' · ') }}
            </template>
            <span v-else class="text-ink-soft">nessuno</span>
          </p>
        </div>
      </div>

      <WeekUsageGrid
        :layout="layout"
        :slots="model.slot"
        :available="teacher.disponibile"
        :usage="usage"
        :colours="colours"
        :weeks="weeks"
      />

      <p class="font-mono text-[10px] text-ink-soft">
        tratteggio = non disponibile · bianco = disponibile ma libero · colorato = lezione
      </p>
    </section>
  </div>
</template>
