<script setup lang="ts">
import { computed } from 'vue'
import {
  BREAK_HEIGHT_REM,
  ROW_HEIGHT_REM,
  rowStart,
  rowTemplate,
  type RailLayout,
} from '@/features/schedule/geometry'
import { hourLabel, weekdayLabel } from '@/lib/subjects'
import type { SlotUsage } from '@/features/insights/workload'
import { GIORNI } from '@/engine/types'

/**
 * One resource's week: which hours it can be used, and what actually landed there.
 *
 * Three states, not two. "Open" and "closed" describe the contract; the third — open and
 * actually busy — is what turns the grid from a form into a diagnosis. An unused open slot is
 * spare capacity, and seeing where it sits explains why the solver had room to work.
 *
 * Teachers and rooms ask the same question, so they share this grid: a room is simply a resource
 * whose every slot is open.
 */
const props = defineProps<{
  layout: RailLayout
  slots: string[]
  /** `available[dayIndex][slotIndex]`. A room passes an all-open matrix. */
  available: boolean[][]
  usage: Map<string, SlotUsage>
  colours: Map<string, string>
  /** How many weeks the course runs, so an occupancy count can be read as a share. */
  weeks: number
  /** When set, each open/closed cell becomes a switch. Rooms are never editable. */
  editable?: boolean
}>()

const emit = defineEmits<{ toggle: [day: number, slot: number] }>()

const days = computed(() => GIORNI.map((_, index) => index))
const cellOf = (day: number, slot: number) => props.usage.get(`${day}|${slot}`)

const HATCH =
  'repeating-linear-gradient(135deg, var(--color-sunken) 0 4px, color-mix(in oklab, var(--color-line) 55%, var(--color-sunken)) 4px 8px)'
</script>

<template>
  <div class="flex gap-px overflow-x-auto border border-line-strong bg-line">
    <div class="w-12 shrink-0 bg-panel">
      <div class="h-6" />
      <div
        v-for="(slot, position) in layout.usable"
        :key="slot"
        class="flex items-center justify-end pr-1.5 font-mono text-[9.5px] text-ink-soft"
        :style="{
          height: `${ROW_HEIGHT_REM}rem`,
          marginTop: position === layout.morningCount ? `${BREAK_HEIGHT_REM}rem` : undefined,
        }"
      >
        {{ hourLabel(slots[slot]) }}
      </div>
    </div>

    <div v-for="day in days" :key="day" class="min-w-[5.5rem] flex-1 bg-panel">
      <div class="flex h-6 items-center justify-center">
        <span class="legend text-[9px] text-ink-soft">{{ weekdayLabel(day).slice(0, 3) }}</span>
      </div>
      <div class="grid" :style="{ gridTemplateRows: rowTemplate(layout) }">
        <component
          :is="editable ? 'button' : 'div'"
          v-for="(slot, position) in layout.usable"
          :key="slot"
          :type="editable ? 'button' : undefined"
          class="m-px flex flex-col justify-center overflow-hidden px-1 text-left"
          :class="
            editable &&
            'transition-shadow hover:shadow-[inset_0_0_0_2px_var(--color-signal)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-signal)]'
          "
          :title="
            editable
              ? available[day]?.[slot]
                ? 'Disponibile — clicca per togliere'
                : 'Non disponibile — clicca per aggiungere'
              : undefined
          "
          :aria-pressed="editable ? available[day]?.[slot] : undefined"
          @click="editable && emit('toggle', day, slot)"
          :style="{
            gridRow: `${rowStart(layout, position)} / span 1`,
            gridColumn: 1,
            background: available[day]?.[slot]
              ? cellOf(day, slot)
                ? `color-mix(in oklab, ${colours.get(cellOf(day, slot)!.materia) ?? 'var(--subject-1)'} 16%, var(--color-panel))`
                : 'var(--color-panel)'
              : HATCH,
            borderLeft: cellOf(day, slot)
              ? `3px solid ${colours.get(cellOf(day, slot)!.materia) ?? 'var(--subject-1)'}`
              : '3px solid transparent',
            boxShadow: available[day]?.[slot] ? 'inset 0 0 0 1px var(--color-line)' : undefined,
          }"
        >
          <template v-if="cellOf(day, slot)">
            <span class="truncate text-[9.5px] font-semibold leading-tight">
              {{ cellOf(day, slot)!.classe }}
            </span>
            <span class="truncate font-mono text-[8.5px] leading-tight text-ink-soft">
              {{ cellOf(day, slot)!.settimane }}/{{ weeks }} sett.
            </span>
          </template>
        </component>
      </div>
    </div>
  </div>
</template>
