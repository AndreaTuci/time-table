<script setup lang="ts">
/** A small numeric field for the data editor. Bare, because it sits inside dense tables. */
const props = defineProps<{ min?: number; max?: number; suffix?: string }>()
const value = defineModel<number>({ required: true })

function commit(event: Event) {
  const parsed = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(parsed)) return
  const bounded = Math.min(Math.max(parsed, props.min ?? 1), props.max ?? Number.MAX_SAFE_INTEGER)
  value.value = bounded
}
</script>

<template>
  <span class="inline-flex items-baseline gap-1">
    <input
      type="number"
      class="w-14 border border-line bg-panel px-1 py-0.5 text-right font-mono text-[11px] transition-colors hover:border-line-strong focus:border-signal"
      :value="value"
      :min="min"
      :max="max"
      @change="commit"
    />
    <span v-if="suffix" class="font-mono text-[9.5px] text-ink-soft">{{ suffix }}</span>
  </span>
</template>
