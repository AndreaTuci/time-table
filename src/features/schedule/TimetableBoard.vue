<script setup lang="ts">
import { computed } from 'vue'
import ClassColumn from './ClassColumn.vue'
import ClosedDayColumn from './ClosedDayColumn.vue'
import TerminalRail from './TerminalRail.vue'
import { CLASS_HEADER_REM, COLUMN_MIN_REM, DAY_HEADER_REM, type RailLayout } from './geometry'
import { shortDate, weekdayLabel } from '@/lib/subjects'
import type { BoardDay, Lesson } from './types'

/**
 * The whole institute on one board: five days, three classes inside each day, ten hours down.
 *
 * Putting the classes side by side inside the day — rather than one tab per class — is the point
 * of the view. Contention for the single computer lab, or for a teacher who follows two classes,
 * is visible as adjacency instead of having to be looked up.
 */
const props = defineProps<{
  lessons: Lesson[]
  days: BoardDay[]
  /** Classes currently switched on. */
  classes: string[]
  /** How many classes exist in total: the day width is sized on this, never on the visible ones. */
  classCount: number
  homeRooms: Record<string, string>
  layout: RailLayout
  colours: Map<string, string>
  slots: string[]
  visibleSubjects: string[]
}>()

const shown = computed(() => new Set(props.visibleSubjects))

/*
 * Days share the available width equally, so the board is exactly as wide as its container and
 * switching a class off simply widens the survivors — the total never moves.
 *
 * The minimum is sized on the FULL roster rather than the visible one, so that threshold does not
 * move either: it is the point below which the board starts scrolling, and it should not depend
 * on which switches happen to be on.
 */
const dayStyle = computed(() => ({
  flex: '1 1 0%',
  minWidth: `${props.classCount * COLUMN_MIN_REM}rem`,
}))

const byDayAndClass = computed(() => {
  const index = new Map<string, Lesson[]>()
  for (const lesson of props.lessons) {
    const key = `${lesson.data}|${lesson.classe}`
    index.set(key, [...(index.get(key) ?? []), lesson])
  }
  return index
})

const lessonsFor = (date: string, className: string) =>
  byDayAndClass.value.get(`${date}|${className}`) ?? []
</script>

<template>
  <div class="overflow-x-auto border border-line-strong bg-panel">
    <div class="flex w-full">
      <TerminalRail :layout="layout" :slots="slots" />

      <div
        v-for="day in days"
        :key="day.data"
        class="border-r-2 border-line-strong last:border-r-0"
        :style="dayStyle"
      >
        <div
          class="flex items-end gap-1.5 border-b border-line px-2 pb-1"
          :style="{ height: `${DAY_HEADER_REM}rem` }"
        >
          <span class="legend text-[10px]" :class="day.closedFor && 'text-fault'">
            {{ weekdayLabel(day.indiceGiorno) }}
          </span>
          <span class="font-mono text-[9.5px]" :class="day.closedFor ? 'text-fault/70' : 'text-ink-soft'">
            {{ shortDate(day.data) }}
          </span>
        </div>

        <div class="flex border-b border-line" :style="{ height: `${CLASS_HEADER_REM}rem` }">
          <div
            v-for="className in day.closedFor ? [] : classes"
            :key="className"
            class="flex min-w-0 flex-1 items-center justify-center border-r border-line last:border-r-0"
          >
            <span class="legend text-[9px] text-ink-soft">{{ className }}</span>
          </div>
        </div>

        <div class="flex">
          <ClosedDayColumn
            v-if="day.closedFor"
            :layout="layout"
            :date="day.data"
            :reason="day.closedFor"
          />
          <ClassColumn
            v-for="className in day.closedFor ? [] : classes"
            :key="className"
            :lessons="lessonsFor(day.data, className)"
            :layout="layout"
            :colours="colours"
            :home-room="homeRooms[className] ?? ''"
            :shown="shown"
          />
        </div>
      </div>
    </div>
  </div>
</template>
