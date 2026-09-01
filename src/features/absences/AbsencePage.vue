<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LostLessonCard from './LostLessonCard.vue'
import { analizzaAssenza, giorniConLezione } from '@/engine/sostituzioni'
import { personName, shortDate, weekdayLabel } from '@/lib/subjects'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

/**
 * "Il tal docente il tal giorno non c'è": cosa salta e come si rimedia.
 *
 * Niente viene applicato all'orario. La domanda che si fa a uno strumento come questo è "che cosa
 * succede se", e la risposta utile è l'elenco delle opzioni con il loro costo — decidere quale
 * prendere è di chi gestisce la scuola.
 */
const props = defineProps<{ model: Modello; result: ScheduleResult; colours: Map<string, string> }>()

const docenti = computed(() =>
  props.model.docenti
    .map((d) => ({ ...d, giorni: giorniConLezione(props.result.lezioni, d.id) }))
    .filter((d) => d.giorni.length > 0)
)

const docente = ref(docenti.value[0]?.id ?? '')
const giorniDisponibili = computed(() => docenti.value.find((d) => d.id === docente.value)?.giorni ?? [])
const data = ref(giorniDisponibili.value[0] ?? '')

// Cambiando docente la data scelta quasi mai gli appartiene: si riparte dal suo primo giorno.
watch(giorniDisponibili, (giorni) => {
  if (!giorni.includes(data.value)) data.value = giorni[0] ?? ''
})

const giorniUtili = computed(() =>
  props.result.calendario.giorni.map((g) => ({ data: g.data, indiceGiorno: g.indiceGiorno }))
)

const perse = computed(() =>
  docente.value && data.value
    ? analizzaAssenza(props.model, props.result.lezioni, giorniUtili.value, docente.value, data.value)
    : []
)

const oreSaltate = computed(() => perse.value.reduce((ore, p) => ore + p.blocco.slot.length, 0))
const senzaUscita = computed(() => perse.value.filter((p) => p.irrecuperabile).length)
const giornoDella = (iso: string) =>
  props.result.calendario.giorni.find((g) => g.data === iso)?.indiceGiorno ?? 0

const campo =
  'border border-line bg-panel px-2 py-1 font-mono text-[11px] transition-colors hover:border-line-strong focus:border-signal'
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-end gap-3 border border-line-strong bg-panel px-3 py-2">
      <label class="flex flex-col gap-1">
        <span class="legend text-[9px] text-ink-soft">docente assente</span>
        <select v-model="docente" :class="campo">
          <option v-for="d in docenti" :key="d.id" :value="d.id">
            {{ personName(d.nome) }} — {{ d.materie.join(' + ') }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="legend text-[9px] text-ink-soft">giorno</span>
        <select v-model="data" :class="campo">
          <option v-for="giorno in giorniDisponibili" :key="giorno" :value="giorno">
            {{ weekdayLabel(giornoDella(giorno)) }} {{ shortDate(giorno) }}
          </option>
        </select>
      </label>

      <p class="ml-auto font-mono text-[10.5px] text-ink-soft">
        <template v-if="perse.length">
          {{ oreSaltate }} ore saltate in {{ perse.length }}
          {{ perse.length === 1 ? 'lezione' : 'lezioni' }}<template v-if="senzaUscita">
            · <span class="text-fault">{{ senzaUscita }} senza rimedio</span>
          </template>
        </template>
      </p>
    </div>

    <p v-if="!perse.length" class="border border-line-strong bg-panel px-3 py-8 text-center text-[11px] text-ink-soft">
      Quel giorno questo docente non ha lezioni: non salta niente.
    </p>

    <LostLessonCard
      v-for="(persa, index) in perse"
      :key="index"
      :persa="persa"
      :model="model"
      :colour="colours.get(persa.blocco.materia) ?? 'var(--subject-1)'"
    />
  </div>
</template>
