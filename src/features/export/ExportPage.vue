<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { toCsv, type FileCsv } from './csv'
import { scaricaCsv } from './download'
import { auleRighe, chiusureRighe, classiRighe, corsiRighe, docentiRighe } from './inputCsv'
import { orarioClasseRighe, orarioRighe } from './scheduleCsv'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

/**
 * Lo scarico dei dati.
 *
 * In cima stanno i dati DI INGRESSO, non l'orario: un orario si giudica solo sapendo cosa doveva
 * coprire e con quali vincoli. Sono anche i file che rendono verificabile a mano quel che il
 * motore ha prodotto — ed e' quello il punto di una demo.
 */
const props = defineProps<{ model: Modello; result: ScheduleResult }>()

const ingresso = computed<FileCsv[]>(() => [
  {
    nome: 'docenti.csv',
    titolo: 'Docenti e disponibilità',
    descrizione: 'Una riga per docente e per giorno, con ogni fascia oraria marcata SI o NO.',
    righe: () => docentiRighe(props.model),
  },
  {
    nome: 'corsi.csv',
    titolo: 'Corsi',
    descrizione: 'Ore totali, tipo di aula, durata del blocco, tetto giornaliero, chi le insegna.',
    righe: () => corsiRighe(props.model),
  },
  {
    nome: 'classi.csv',
    titolo: 'Classi',
    descrizione: 'Periodo, aula casa, limiti di giornata, materie e monte ore.',
    righe: () => classiRighe(props.model),
  },
  { nome: 'aule.csv', titolo: 'Aule', descrizione: 'Nome e tipo.', righe: () => auleRighe(props.model) },
  {
    nome: 'chiusure.csv',
    titolo: 'Chiusure',
    descrizione: 'Le chiusure della scuola. Le festività nazionali sono calcolate dal motore.',
    righe: () => chiusureRighe(props.model),
  },
])

const uscita = computed<FileCsv[]>(() => [
  {
    nome: 'orario.csv',
    titolo: 'Orario completo',
    descrizione: 'Una riga per ora di lezione: si filtra e si verifica con un foglio di calcolo.',
    righe: () => orarioRighe(props.model, props.result),
  },
  ...Object.keys(props.model.classi).map((classe) => ({
    nome: `orario-${classe.toLowerCase()}.csv`,
    titolo: `Orario di ${classe}`,
    descrizione: 'Una riga per giorno e una colonna per ora: la griglia da appendere in bacheca.',
    righe: () => orarioClasseRighe(props.model, props.result, classe),
  })),
])

function scarica(file: FileCsv) {
  scaricaCsv(file.nome, toCsv(file.righe()))
}

const conteggio = (file: FileCsv) => Math.max(file.righe().length - 1, 0)
</script>

<template>
  <div class="space-y-3">
    <section
      v-for="gruppo in [
        { titolo: 'dati di ingresso', files: ingresso, nota: 'Quello che è entrato nel generatore.' },
        { titolo: 'orario generato', files: uscita, nota: 'Quello che ne è uscito.' },
      ]"
      :key="gruppo.titolo"
      class="border border-line-strong bg-panel"
    >
      <header class="flex items-baseline gap-3 border-b border-line px-3 py-2">
        <h2 class="legend text-[10px]">{{ gruppo.titolo }}</h2>
        <p class="font-mono text-[9.5px] text-ink-soft">{{ gruppo.nota }}</p>
      </header>
      <ul class="divide-y divide-line">
        <li
          v-for="file in gruppo.files"
          :key="file.nome"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
        >
          <div class="min-w-0 flex-1">
            <p class="text-[11.5px] font-semibold">{{ file.titolo }}</p>
            <p class="text-[10.5px] text-ink-soft">{{ file.descrizione }}</p>
          </div>
          <span class="shrink-0 font-mono text-[9.5px] text-ink-soft">
            {{ conteggio(file) }} righe
          </span>
          <code class="shrink-0 font-mono text-[9.5px] text-ink-soft">{{ file.nome }}</code>
          <Button size="sm" class="shrink-0" @click="scarica(file)">scarica</Button>
        </li>
      </ul>
    </section>

    <p class="font-mono text-[10px] text-ink-soft">
      I file usano il punto e virgola come separatore e partono con un BOM: si aprono in Excel
      italiano senza passare dalla procedura di importazione, accenti compresi.
    </p>
  </div>
</template>
