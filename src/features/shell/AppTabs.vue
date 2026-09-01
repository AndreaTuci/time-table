<script setup lang="ts">
/** Panel selector. Reads as a row of engraved tabs on the cabinet, not as web navigation. */
defineProps<{ tabs: readonly { id: string; label: string }[] }>()
const current = defineModel<string>({ required: true })
</script>

<template>
  <nav class="flex gap-px border-b border-line-strong" aria-label="Sezioni">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="legend border border-b-0 px-3 py-1.5 text-[9.5px] transition-colors"
      :class="
        current === tab.id
          ? 'border-line-strong bg-panel text-ink'
          : 'border-transparent text-ink-soft hover:bg-panel/60 hover:text-ink'
      "
      :aria-current="current === tab.id ? 'page' : undefined"
      @click="current = tab.id"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>
