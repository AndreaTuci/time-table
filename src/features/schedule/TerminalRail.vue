<script setup lang="ts">
import { computed } from 'vue'
import { BOARD_HEADER_REM, ROW_HEIGHT_REM, BREAK_HEIGHT_REM, type RailLayout } from './geometry'
import { hourLabel } from '@/lib/subjects'

/**
 * The signature element: the hour column is a DIN rail carrying numbered terminals.
 *
 * The bar runs the full height of the board and stops between terminal 5 and 6, where the
 * cabinet ends and lunch begins. That interruption is the whole idea — the break is a gap in
 * the hardware, not a grey row, and it needs no label to be understood.
 */
const props = defineProps<{ layout: RailLayout; slots: string[] }>()

const morning = computed(() => props.layout.usable.slice(0, props.layout.morningCount))
const afternoon = computed(() => props.layout.usable.slice(props.layout.morningCount))
const runHeight = (count: number) => `${count * ROW_HEIGHT_REM}rem`
</script>

<template>
  <div class="sticky left-0 z-20 w-16 shrink-0 bg-frame">
    <div :style="{ height: `${BOARD_HEADER_REM}rem` }" class="flex items-end pb-1 pl-1">
      <span class="legend text-[9px] text-ink-soft">ora</span>
    </div>

    <div
      v-for="(run, runIndex) in [morning, afternoon]"
      :key="runIndex"
      class="relative"
      :style="{
        height: runHeight(run.length),
        marginTop: runIndex === 1 ? `${BREAK_HEIGHT_REM}rem` : undefined,
      }"
    >
      <!-- The rail itself: a continuous bar, cut where the run ends. -->
      <div class="absolute left-3 top-0 bottom-0 w-1.5 bg-rail" aria-hidden="true" />

      <div
        v-for="(slot, i) in run"
        :key="slot"
        class="relative flex items-center"
        :style="{ height: `${ROW_HEIGHT_REM}rem` }"
      >
        <!-- A terminal clipped onto the rail -->
        <span
          class="absolute left-[0.4rem] h-4 w-[0.85rem] border border-line-strong bg-panel"
          aria-hidden="true"
        />
        <span class="ml-6 font-mono text-[11px] leading-none text-ink-soft">
          {{ hourLabel(slots[slot]) }}
        </span>
      </div>
    </div>
  </div>
</template>
