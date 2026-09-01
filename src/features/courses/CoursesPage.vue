<script setup lang="ts">
import { computed } from 'vue'
import { personName } from '@/lib/subjects'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

const props = defineProps<{ model: Modello; result: ScheduleResult; colours: Map<string, string> }>()

/**
 * One row per subject, showing the four numbers that decide how it lands on the board: how many
 * hours it owes, how long a single lesson is, how much of it may happen in one day, and which
 * kind of room it needs. Read together they explain why a lab takes half a day and a classroom
 * subject never does.
 */
const rows = computed(() =>
  Object.values(props.model.materie).map((subject) => {
    const classes = Object.values(props.model.classi)
      .filter((c) => c.materie.includes(subject.id))
      .map((c) => c.id)
    return {
      ...subject,
      classi: classes,
      abilitati: props.model.docenti.filter((d) => d.materie.includes(subject.id)),
      titolari: props.result.titolari.filter((t) => t.materia === subject.id),
      oreComplessive: subject.oreTotali * classes.length,
    }
  })
)
</script>

<template>
  <div class="overflow-x-auto border border-line-strong bg-panel">
    <table class="w-full min-w-[54rem] border-collapse text-[11px]">
      <thead>
        <tr class="border-b border-line-strong text-left">
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">materia</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">ore</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">×&nbsp;classi</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">aula</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">blocco</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">max/giorno</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">titolari</th>
          <th class="legend px-3 py-2 text-[9px] text-ink-soft">altri abilitati</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="border-b border-line last:border-b-0">
          <td class="px-3 py-2">
            <span class="flex items-center gap-2">
              <span class="h-3 w-1 shrink-0" :style="{ background: colours.get(row.id) }" />
              <span class="font-semibold">{{ row.id }}</span>
            </span>
          </td>
          <td class="px-3 py-2 font-mono">{{ row.oreTotali }}</td>
          <td class="px-3 py-2 font-mono text-ink-soft">
            {{ row.classi.join(' ') }} = {{ row.oreComplessive }}h
          </td>
          <td class="px-3 py-2 font-mono text-ink-soft">{{ row.tipoAula }}</td>
          <td class="px-3 py-2 font-mono">{{ row.bloccoOre }}h</td>
          <td class="px-3 py-2 font-mono">{{ row.maxOreGiorno }}h</td>
          <td class="px-3 py-2 font-mono">
            {{ row.titolari.map((t) => `${t.classe}: ${personName(t.docente)}`).join(' · ') }}
          </td>
          <td class="px-3 py-2 font-mono text-ink-soft">
            <template v-if="row.abilitati.length > row.titolari.length">
              {{
                row.abilitati
                  .filter((d) => !row.titolari.some((t) => t.docente === d.id))
                  .map((d) => personName(d.nome))
                  .join(' · ')
              }}
            </template>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
