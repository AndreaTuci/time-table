<script setup lang="ts">
import { computed } from 'vue'
import { personName } from '@/lib/subjects'
import type { Lesson } from './types'

/**
 * A lesson sitting on the board. The subject's hue lives on the left edge as a conductor stripe;
 * the fill is the same hue, heavily diluted, so a dense grid never turns into a colour chart.
 */
const props = defineProps<{
  lesson: Lesson
  colour: string
  hours: number
  homeRoom: boolean
}>()

// A one-hour tile has no room for anything but the subject name.
const compact = computed(() => props.hours < 2)
</script>

<template>
  <div
    class="relative flex h-full flex-col justify-center overflow-hidden border border-line/60 border-l-[3px] px-1 py-1"
    :class="lesson.variazione && 'ring-1 ring-signal ring-inset'"
    :title="
      lesson.variazione === 'sostituzione'
        ? 'Docente sostituito a mano'
        : lesson.variazione === 'recupero'
          ? 'Lezione recuperata qui'
          : undefined
    "
    :style="{
      borderLeftColor: colour,
      background: `color-mix(in oklab, ${colour} 10%, var(--color-panel))`,
    }"
  >
    <!-- Una lezione ritoccata a mano non deve poter passare per una generata dal motore. -->
    <span
      v-if="lesson.variazione"
      class="absolute right-0 top-0 h-0 w-0 border-l-[6px] border-t-[6px] border-l-transparent border-t-signal"
      aria-hidden="true"
    />
    <!-- The name wraps rather than truncating: "CULTURA GE…" identifies nothing. -->
    <p class="line-clamp-2 text-[10.5px] font-semibold leading-[1.15]" :style="{ color: colour }">
      {{ lesson.materia }}
    </p>
    <p v-if="!compact" class="truncate font-mono text-[9.5px] leading-tight text-ink-soft">
      {{ personName(lesson.docente) }}
    </p>
    <!-- The home room is implicit; only a move to a lab is worth naming. -->
    <p v-if="!compact && !homeRoom" class="truncate font-mono text-[9.5px] leading-tight text-ink-soft">
      ↳ {{ lesson.aula }}
    </p>
  </div>
</template>
