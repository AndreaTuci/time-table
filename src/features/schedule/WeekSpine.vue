<script setup lang="ts">
import { computed } from 'vue'
import { dayNumber, monthName } from '@/lib/subjects'

/**
 * The fourteen weeks as a strip of segments: navigation and diagnosis in one control.
 *
 * A week's segment is as tall as the hours it carries, so a short week reads as a notch rather
 * than as a number to look up. The 1st of November falls on a Friday and punches a visible dent.
 */
const props = defineProps<{
  weeks: { index: number; days: number; hours: number; firstDate: string }[]
  current: number
}>()

const emit = defineEmits<{ select: [index: number] }>()

const tallest = computed(() => Math.max(...props.weeks.map((w) => w.hours), 1))

/**
 * Il mese si scrive per esteso solo quando cambia. Ripeterlo su tutte e quattordici le settimane
 * riempirebbe la spina di parole identiche; scritto una volta, marca il passaggio da un mese
 * all'altro e le altre settimane restano un numero leggibile a colpo d'occhio.
 */
const etichette = computed(() =>
  props.weeks.map((week, indice) => {
    const precedente = props.weeks[indice - 1]?.firstDate
    const cambiaMese = !precedente || monthName(precedente) !== monthName(week.firstDate)
    return {
      giorno: week.firstDate ? dayNumber(week.firstDate) : '',
      mese: cambiaMese && week.firstDate ? monthName(week.firstDate) : '',
    }
  })
)
</script>

<template>
  <div class="border border-line-strong bg-panel px-3 py-2">
    <div class="mb-1.5 flex items-baseline justify-between">
      <span class="legend text-[9px] text-ink-soft">settimane</span>
      <span class="font-mono text-[9.5px] text-ink-soft">
        barra corta = settimana accorciata da una chiusura
      </span>
    </div>
    <div class="flex items-end gap-[3px]">
      <button
        v-for="week in weeks"
        :key="week.index"
        class="group relative flex-1 border-b-2 pt-1 transition-colors"
        :class="week.index === current ? 'border-signal' : 'border-transparent hover:border-signal/50'"
        :aria-label="`Settimana ${week.index + 1}, ${week.hours} ore in ${week.days} giorni`"
        :aria-current="week.index === current ? 'true' : undefined"
        @click="emit('select', week.index)"
      >
        <span
          class="block w-full transition-colors"
          :style="{ height: `${Math.round((week.hours / tallest) * 28) + 2}px` }"
          :class="week.index === current ? 'bg-signal' : 'bg-rail/40 group-hover:bg-signal/60'"
        />
        <span
          class="mt-1 block truncate font-mono text-[9px]"
          :class="week.index === current ? 'text-ink' : 'text-ink-soft'"
        >
          {{ etichette[week.index].giorno }}
          <span v-if="etichette[week.index].mese" class="text-ink">
            {{ etichette[week.index].mese }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
