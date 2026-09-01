<script setup lang="ts">
import { computed } from 'vue'
import type { SubjectCoverage } from './types'

/**
 * Not a progress bar. Total hours have to be hit EXACTLY, not maximised: a course that overruns
 * is as wrong as one that falls short. So the gauge carries a target notch, and the fill is read
 * against it — under, on, or past.
 */
const props = defineProps<{ row: SubjectCoverage; colour: string }>()

const OVERSHOOT_ROOM = 1.25

const fill = computed(() => {
  if (props.row.oreRichieste === 0) return 0
  const ratio = props.row.oreProgrammate / props.row.oreRichieste
  return Math.min(ratio, OVERSHOOT_ROOM) / OVERSHOOT_ROOM
})
const onTarget = computed(() => props.row.oreProgrammate === props.row.oreRichieste)
const notch = computed(() => 1 / OVERSHOOT_ROOM)
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="min-w-0 flex-1 truncate text-[11px]">{{ row.materia }}</span>
    <div class="relative h-2 w-24 shrink-0 border border-line-strong bg-sunken">
      <div class="h-full" :style="{ width: `${fill * 100}%`, background: colour }" />
      <span
        class="absolute top-[-2px] bottom-[-2px] w-px bg-ink"
        :style="{ left: `${notch * 100}%` }"
        aria-hidden="true"
      />
    </div>
    <span
      class="w-14 shrink-0 text-right font-mono text-[10px]"
      :class="onTarget ? 'text-valid' : 'text-fault'"
    >
      {{ row.oreProgrammate }}/{{ row.oreRichieste }}
    </span>
  </div>
</template>
