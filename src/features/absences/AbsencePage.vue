<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LostLessonCard from './LostLessonCard.vue'
import { Button } from '@/components/ui/button'
import { aggiungiVariazione, rimuoviVariazione, variazioni } from '@/data/store'
import { analizzaAssenza, giorniConLezione, type LezionePersa } from '@/engine/sostituzioni'
import { personName, shortDate, weekdayLabel } from '@/lib/subjects'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

/**
 * "Il tal docente il tal giorno non c'è": cosa salta e come si rimedia.
 *
 * Le opzioni si applicano come RITOCCHI: cambia solo cio' che salta, il resto dell'orario non si
 * muove. E' come lavora una scuola vera — a orario gia' distribuito, rigenerare tutto cambierebbe
 * la settimana a chiunque, ed e' proprio il motivo per cui le sostituzioni esistono.
 *
 * Le opzioni si ricalcolano sull'orario GIA' ritoccato, quindi due recuperi non possono finire
 * nella stessa ora: applicato il primo, il secondo vede la casella occupata e sparisce dall'elenco.
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

function sostituisci(persa: LezionePersa, docenteNuovo: string) {
  aggiungiVariazione({
    tipo: 'sostituzione',
    classe: persa.blocco.classe,
    materia: persa.blocco.materia,
    data: persa.blocco.data,
    slot: [...persa.blocco.slot],
    docenteOriginale: persa.blocco.docente,
    docenteNuovo,
  })
}

function recupera(persa: LezionePersa, indice: number) {
  const scelto = persa.recuperi[indice]
  if (!scelto) return
  aggiungiVariazione({
    tipo: 'recupero',
    classe: persa.blocco.classe,
    materia: persa.blocco.materia,
    docente: persa.blocco.docente,
    data: persa.blocco.data,
    slot: [...persa.blocco.slot],
    nuovaData: scelto.data,
    nuovoIndiceGiorno: scelto.indiceGiorno,
    nuoviSlot: [...scelto.slot],
    nuovaAula: scelto.aula,
  })
}

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
      @sostituisci="sostituisci(persa, $event)"
      @recupera="recupera(persa, $event)"
    />

    <section v-if="variazioni.length" class="border border-line-strong bg-panel">
      <header class="border-b border-line px-3 py-2">
        <h2 class="legend text-[10px]">
          variazioni applicate all'orario ({{ variazioni.length }})
        </h2>
      </header>
      <ul class="divide-y divide-line">
        <li
          v-for="(variazione, indice) in variazioni"
          :key="indice"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[11px]"
        >
          <span class="legend text-[9px] text-signal">{{ variazione.tipo }}</span>
          <span class="font-semibold">{{ variazione.classe }} · {{ variazione.materia }}</span>
          <span v-if="variazione.tipo === 'sostituzione'" class="font-mono text-[10px] text-ink-soft">
            {{ shortDate(variazione.data) }} · {{ personName(variazione.docenteOriginale) }}
            → {{ personName(variazione.docenteNuovo) }}
          </span>
          <span v-else class="font-mono text-[10px] text-ink-soft">
            {{ shortDate(variazione.data) }} → {{ shortDate(variazione.nuovaData) }}
            · {{ personName(variazione.docente) }} · {{ variazione.nuovaAula }}
          </span>
          <Button variant="ghost" size="sm" class="ml-auto" @click="rimuoviVariazione(indice)">
            annulla
          </Button>
        </li>
      </ul>
    </section>
  </div>
</template>
