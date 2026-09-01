<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { shortDate } from '@/lib/subjects'

/**
 * The "cartiglio": the boxed information panel every technical drawing carries, with fixed and
 * labelled fields. Moved to the top because here it is the first thing to read, not the last.
 */
defineProps<{
  from: string
  to: string
  week: number
  weeks: number
  scheduled: number
  required: number
  workingDays: number
  unresolved: number
  seconds: number
}>()
</script>

<template>
  <div class="border border-line-strong bg-panel">
    <div class="flex flex-wrap items-stretch divide-x divide-line">
      <div class="px-3 py-2">
        <p class="legend text-[9px] text-ink-soft">periodo</p>
        <p class="font-mono text-[12px]">{{ shortDate(from) }} → {{ shortDate(to) }}</p>
      </div>
      <div class="px-3 py-2">
        <p class="legend text-[9px] text-ink-soft">settimana</p>
        <p class="font-mono text-[12px]">
          {{ String(week + 1).padStart(2, '0') }}<span class="text-ink-soft">/{{ weeks }}</span>
        </p>
      </div>
      <div class="px-3 py-2">
        <p class="legend text-[9px] text-ink-soft">giorni utili</p>
        <p class="font-mono text-[12px]">{{ workingDays }}</p>
      </div>
      <div class="px-3 py-2">
        <p class="legend text-[9px] text-ink-soft">ore collocate</p>
        <p class="font-mono text-[12px]">
          {{ scheduled }}<span class="text-ink-soft">/{{ required }}</span>
        </p>
      </div>
      <div class="px-3 py-2">
        <p class="legend text-[9px] text-ink-soft">calcolo</p>
        <p class="font-mono text-[12px]">{{ seconds.toFixed(2) }}s</p>
      </div>
      <div class="ml-auto flex items-center px-3 py-2">
        <Badge :state="unresolved === 0 && scheduled === required ? 'valid' : 'fault'">
          {{ unresolved === 0 && scheduled === required ? 'orario valido' : `${unresolved} settimane aperte` }}
        </Badge>
      </div>
    </div>
  </div>
</template>
