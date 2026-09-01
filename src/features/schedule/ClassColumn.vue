<script setup lang="ts">
import { computed } from 'vue'
import LessonTile from './LessonTile.vue'
import { groupIntoBlocks } from './blocks'
import { blockRow, rowStart, rowTemplate, ROW_HEIGHT_REM, type RailLayout } from './geometry'
import type { Lesson } from './types'

const props = defineProps<{
  lessons: Lesson[]
  layout: RailLayout
  colours: Map<string, string>
  homeRoom: string
}>()

const blocks = computed(() => groupIntoBlocks(props.lessons, props.layout.usable))
const hoursToday = computed(() => props.lessons.length)
</script>

<template>
  <div class="w-[7.5rem] shrink-0 border-r border-line last:border-r-0">
    <div class="grid" :style="{ gridTemplateRows: rowTemplate(layout) }">
      <!-- Empty seats: the void is sunken metal, never white. -->
      <div
        v-for="(slot, position) in layout.usable"
        :key="'seat' + slot"
        class="border-b border-line/50 bg-sunken"
        :style="{ gridRow: `${rowStart(layout, position)} / span 1`, gridColumn: 1 }"
      />
      <div
        v-for="block in blocks"
        :key="block.position"
        class="p-[2px]"
        :style="{ gridRow: blockRow(layout, block.position, block.length), gridColumn: 1 }"
      >
        <LessonTile
          :lesson="block.lesson"
          :colour="colours.get(block.lesson.materia) ?? 'var(--subject-1)'"
          :hours="block.length"
          :home-room="block.lesson.aula === homeRoom"
        />
      </div>
    </div>
    <p
      class="border-t border-line py-0.5 text-center font-mono text-[9px]"
      :class="hoursToday === 0 ? 'text-ink-soft/50' : 'text-ink-soft'"
      :style="{ minHeight: `${ROW_HEIGHT_REM / 2}rem` }"
    >
      {{ hoursToday }}h
    </p>
  </div>
</template>
