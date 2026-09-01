<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Panel control. Square corners and a hard border on purpose: these read as switches screwed
 * onto a cabinet, not as web buttons.
 */
const button = cva(
  'inline-flex items-center justify-center gap-1.5 border font-display font-semibold ' +
    'transition-colors disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        default: 'border-line-strong bg-panel text-ink hover:bg-sunken',
        active: 'border-signal bg-signal text-panel',
        ghost: 'border-transparent text-ink-soft hover:bg-sunken hover:text-ink',
      },
      size: {
        default: 'h-8 px-3 text-[11px]',
        sm: 'h-6 px-2 text-[10px]',
        icon: 'h-8 w-8 text-[13px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

type ButtonVariants = VariantProps<typeof button>

const props = defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: string
}>()
</script>

<template>
  <button :class="cn(button({ variant: props.variant, size: props.size }), props.class)">
    <slot />
  </button>
</template>
