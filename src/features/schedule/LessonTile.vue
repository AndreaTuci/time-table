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
    class="flex h-full flex-col justify-center overflow-hidden border border-line/60 border-l-[3px] px-1.5 py-1"
    :style="{
      borderLeftColor: colour,
      background: `color-mix(in oklab, ${colour} 10%, var(--color-panel))`,
    }"
  >
    <p class="truncate text-[10.5px] font-semibold leading-tight" :style="{ color: colour }">
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
