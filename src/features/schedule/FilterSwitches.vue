<script setup lang="ts">
import { computed } from 'vue'

/**
 * A row of switches that both filters the board and labels it.
 *
 * The same swatch that tells you which hue means which subject is the control that turns it off,
 * so the legend and the filter are one object instead of two things to keep in sync. Used for
 * subjects and for classes alike — the only difference is whether the items carry a colour.
 */
const props = defineProps<{
  label: string
  items: string[]
  colours?: Map<string, string>
}>()

const visible = defineModel<string[]>({ required: true })

const allVisible = computed(() => visible.value.length === props.items.length)

function toggle(item: string) {
  const next = new Set(visible.value)
  if (next.has(item)) next.delete(item)
  else next.add(item)
  // Rebuild from declaration order so the switches never reorder themselves under the cursor.
  visible.value = props.items.filter((candidate) => next.has(candidate))
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="legend mr-1 w-14 shrink-0 text-[9px] text-ink-soft">{{ label }}</span>

    <button
      v-for="item in items"
      :key="item"
      type="button"
      class="flex items-center gap-1.5 border px-2 py-1 text-[10.5px] font-semibold transition-colors"
      :class="
        visible.includes(item)
          ? 'border-line-strong bg-panel text-ink hover:border-signal hover:text-signal'
          : 'border-line bg-sunken text-ink-soft/60 hover:border-line-strong hover:text-ink-soft'
      "
      :aria-pressed="visible.includes(item)"
      @click="toggle(item)"
    >
      <span
        v-if="colours"
        class="h-2.5 w-2.5 shrink-0 border"
        :style="{
          background: visible.includes(item) ? colours.get(item) : 'transparent',
          borderColor: colours.get(item),
        }"
        aria-hidden="true"
      />
      {{ item }}
    </button>

    <button
      type="button"
      class="ml-auto border border-transparent px-2 py-1 text-[10px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline disabled:no-underline disabled:opacity-40"
      :disabled="allVisible"
      @click="visible = [...items]"
    >
      mostra tutte
    </button>
  </div>
</template>
