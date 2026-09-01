<script setup lang="ts">
import { computed } from 'vue'

/**
 * Subject switches, sitting above the board.
 *
 * They double as the legend: the swatch that tells you which hue means which subject is the same
 * control that hides it. Isolating one subject is the fastest way to read a dense board, so the
 * control lives where the eye already is instead of in a settings panel.
 */
const props = defineProps<{ subjects: string[]; colours: Map<string, string> }>()
const visible = defineModel<string[]>({ required: true })

const allVisible = computed(() => visible.value.length === props.subjects.length)

function toggle(subject: string) {
  const next = new Set(visible.value)
  if (next.has(subject)) next.delete(subject)
  else next.add(subject)
  // Rebuild from the declaration order so the switches never reorder themselves under the cursor.
  visible.value = props.subjects.filter((s) => next.has(s))
}

function showAll() {
  visible.value = [...props.subjects]
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5 border border-line-strong bg-panel px-3 py-2">
    <span class="legend mr-1 text-[9px] text-ink-soft">materie</span>

    <button
      v-for="subject in subjects"
      :key="subject"
      type="button"
      class="flex items-center gap-1.5 border px-2 py-1 text-[10.5px] font-semibold transition-colors"
      :class="
        visible.includes(subject)
          ? 'border-line-strong bg-panel text-ink'
          : 'border-line bg-sunken text-ink-soft/60'
      "
      :aria-pressed="visible.includes(subject)"
      @click="toggle(subject)"
    >
      <span
        class="h-2.5 w-2.5 shrink-0 border"
        :style="{
          background: visible.includes(subject) ? colours.get(subject) : 'transparent',
          borderColor: colours.get(subject),
        }"
        aria-hidden="true"
      />
      {{ subject }}
    </button>

    <button
      type="button"
      class="ml-auto border border-transparent px-2 py-1 text-[10px] text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
      :disabled="allVisible"
      @click="showAll"
    >
      mostra tutte
    </button>
  </div>
</template>
