<script setup lang="ts">
import { computed } from 'vue'
import type { SubjectCoverage } from './types'

/**
 * Hours scheduled against hours owed.
 *
 * Not a progress bar in spirit: the total has to be hit EXACTLY, and a course that overruns is
 * as wrong as one that falls short. The track therefore ENDS at the target, so a correct subject
 * reads as full; a shortfall leaves a visible gap, and an overrun sticks out past the edge in the
 * fault colour. An earlier version reserved room for the overrun inside the track, which made
 * every correct row sit at 80% and look permanently unfinished.
 */
const props = defineProps<{ row: SubjectCoverage; colour: string }>()

const delta = computed(() => props.row.oreProgrammate - props.row.oreRichieste)

const filled = computed(() => {
  if (props.row.oreRichieste === 0) return 0
  return Math.min(props.row.oreProgrammate / props.row.oreRichieste, 1) * 100
})

/** How far past the end an overrun sticks out, as a share of the track. Capped so it stays legible. */
const OVERRUN_CAP = 0.3
const overrun = computed(() => {
  if (delta.value <= 0 || props.row.oreRichieste === 0) return 0
  return Math.min(delta.value / props.row.oreRichieste, OVERRUN_CAP) * 100
})

const label = computed(() => {
  if (delta.value === 0) return `${props.row.oreProgrammate}/${props.row.oreRichieste}`
  return `${delta.value > 0 ? '+' : '−'}${Math.abs(delta.value)} h`
})
</script>

<template>
  <div
    class="flex items-center gap-2"
    :title="`${row.materia}: ${row.oreProgrammate} ore programmate su ${row.oreRichieste} richieste`"
  >
    <span class="min-w-0 flex-1 truncate text-[11px]">{{ row.materia }}</span>

    <div class="relative h-2.5 w-24 shrink-0 border border-line-strong bg-sunken">
      <div class="h-full" :style="{ width: `${filled}%`, background: colour }" />
      <!-- An overrun leaves the track: it is not progress, it is damage. -->
      <div
        v-if="overrun > 0"
        class="absolute top-[-2px] bottom-[-2px] left-full bg-fault"
        :style="{ width: `${overrun}%` }"
      />
    </div>

    <span
      class="w-16 shrink-0 text-right font-mono text-[10px]"
      :class="delta === 0 ? 'text-valid' : 'text-fault'"
    >
      {{ label }}
    </span>
  </div>
</template>
