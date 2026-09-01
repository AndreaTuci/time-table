<script setup lang="ts">
import { bodyHeightRem, type RailLayout } from './geometry'
import { shortDate } from '@/lib/subjects'

/**
 * A closure standing where a teaching day would be.
 *
 * Leaving these days out entirely — which is what the board did before — quietly turned a
 * four-day week into a normal-looking one, and the missing hours had no visible cause. Drawing
 * the closure keeps the week five columns wide and makes the reason legible on the spot.
 */
defineProps<{ layout: RailLayout; date: string; reason: string }>()
</script>

<template>
  <div
    class="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden border-r border-line last:border-r-0"
    :style="{
      height: `${bodyHeightRem(layout)}rem`,
      background:
        'repeating-linear-gradient(135deg, color-mix(in oklab, var(--color-fault) 7%, var(--color-panel)) 0 6px, color-mix(in oklab, var(--color-fault) 12%, var(--color-panel)) 6px 12px)',
    }"
  >
    <div class="rotate-180 text-center [writing-mode:vertical-rl]">
      <p class="legend text-[10px] text-fault">festivo</p>
      <p class="mt-1 font-mono text-[9.5px] text-fault/80">{{ reason }}</p>
      <p class="mt-1 font-mono text-[9px] text-fault/60">{{ shortDate(date) }}</p>
    </div>
  </div>
</template>
