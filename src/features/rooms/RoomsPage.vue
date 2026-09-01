<script setup lang="ts">
import { computed, ref } from 'vue'
import WeekUsageGrid from '@/features/insights/WeekUsageGrid.vue'
import { weeklyUsage } from '@/features/insights/workload'
import { railLayout } from '@/features/schedule/geometry'
import type { ScheduleResult } from '@/features/schedule/types'
import { GIORNI, type Modello } from '@/engine/types'

const props = defineProps<{ model: Modello; result: ScheduleResult; colours: Map<string, string> }>()

const selected = ref(props.model.aule[0]?.id ?? '')

const weeks = computed(() => props.result.calendario.numeroSettimane)
const layout = computed(() => railLayout(props.model.slot, props.model.slotUtili, props.model.pausaPranzo))

/** A room is open whenever the school is: every usable slot, every day. */
const alwaysOpen = computed(() =>
  GIORNI.map(() => props.model.slot.map((_, index) => props.model.slotUtili.includes(index)))
)

const lessonsByRoom = computed(() => {
  const perRoom = new Map<string, number>()
  for (const lesson of props.result.lezioni) {
    perRoom.set(lesson.aula, (perRoom.get(lesson.aula) ?? 0) + 1)
  }
  return perRoom
})

const capacity = computed(
  () => props.result.calendario.giorni.length * props.model.slotUtili.length
)

const usage = computed(() =>
  weeklyUsage(props.result.lezioni.filter((lesson) => lesson.aula === selected.value))
)
</script>

<template>
  <div class="grid items-start gap-3 lg:grid-cols-[17rem_1fr]">
    <ul class="divide-y divide-line border border-line-strong bg-panel">
      <li v-for="room in model.aule" :key="room.id">
        <button
          type="button"
          class="w-full px-3 py-2 text-left transition-colors"
          :class="room.id === selected ? 'bg-signal/10' : 'hover:bg-sunken'"
          :aria-current="room.id === selected ? 'true' : undefined"
          @click="selected = room.id"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-[11.5px] font-semibold">{{ room.id }}</span>
            <span class="font-mono text-[9.5px] text-ink-soft">
              {{ Math.round(((lessonsByRoom.get(room.id) ?? 0) / capacity) * 100) }}%
            </span>
          </div>
          <p class="font-mono text-[9.5px] text-ink-soft">{{ room.tipo }}</p>
          <div class="mt-1 h-1 w-full bg-sunken">
            <div
              class="h-full bg-signal"
              :style="{ width: `${((lessonsByRoom.get(room.id) ?? 0) / capacity) * 100}%` }"
            />
          </div>
        </button>
      </li>
    </ul>

    <section class="space-y-3">
      <div class="flex flex-wrap items-stretch divide-x divide-line border border-line-strong bg-panel">
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">aula</p>
          <p class="text-[13px] font-semibold">{{ selected }}</p>
        </div>
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">tipo</p>
          <p class="font-mono text-[12px]">{{ model.aule.find((a) => a.id === selected)?.tipo }}</p>
        </div>
        <div class="px-3 py-2">
          <p class="legend text-[9px] text-ink-soft">ore occupate</p>
          <p class="font-mono text-[12px]">
            {{ lessonsByRoom.get(selected) ?? 0 }}<span class="text-ink-soft">/{{ capacity }}</span>
          </p>
        </div>
      </div>

      <WeekUsageGrid
        :layout="layout"
        :slots="model.slot"
        :available="alwaysOpen"
        :usage="usage"
        :colours="colours"
        :weeks="weeks"
      />

      <p class="font-mono text-[10px] text-ink-soft">
        bianco = aula libera · colorato = classe e materia che la occupano di norma
      </p>
    </section>
  </div>
</template>
