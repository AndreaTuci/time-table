<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Status lamp on the title block: says whether the generated schedule is sound. */
const badge = cva(
  'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
  {
    variants: {
      state: {
        valid: 'border-valid/40 text-valid',
        fault: 'border-fault/40 text-fault',
        caution: 'border-caution/40 text-caution',
        idle: 'border-line-strong text-ink-soft',
      },
    },
    defaultVariants: { state: 'idle' },
  }
)

const props = defineProps<{ state?: VariantProps<typeof badge>['state']; class?: string }>()
</script>

<template>
  <span :class="cn(badge({ state: props.state }), props.class)">
    <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    <slot />
  </span>
</template>
