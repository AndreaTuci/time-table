<script setup lang="ts">
import { computed } from 'vue'
import type { LezionePersa } from '@/engine/sostituzioni'
import { Button } from '@/components/ui/button'
import { personName, shortDate, weekdayLabel } from '@/lib/subjects'
import type { Modello } from '@/engine/types'

/**
 * Una lezione saltata, con le due uscite possibili affiancate.
 *
 * Non sono alternative da classificare in migliore e peggiore, sono due decisioni diverse: il
 * sostituto salva l'ora dov'era e non tocca nient'altro, il recupero sposta la lezione tenendo il
 * titolare. Quale convenga lo sa la scuola, non il motore — quindi si mostrano entrambe con il
 * loro costo, e si applica quella che si sceglie.
 */
const props = defineProps<{ persa: LezionePersa; model: Modello; colour: string }>()
const emit = defineEmits<{
  sostituisci: [docente: string]
  recupera: [indice: number]
}>()

const orario = computed(() => {
  const slot = props.persa.blocco.slot
  const inizio = props.model.slot[slot[0]].slice(0, 5)
  const fine = props.model.slot[slot[slot.length - 1]].slice(6)
  return `${inizio}–${fine}`
})

const fascia = (slot: number[]) =>
  `${props.model.slot[slot[0]].slice(0, 5)}–${props.model.slot[slot[slot.length - 1]].slice(6)}`
</script>

<template>
  <article class="border border-line-strong bg-panel">
    <header class="flex flex-wrap items-baseline gap-x-3 border-b border-line px-3 py-2">
      <span class="h-3 w-1 shrink-0 self-center" :style="{ background: colour }" aria-hidden="true" />
      <span class="text-[12px] font-semibold">{{ persa.blocco.materia }}</span>
      <span class="legend text-[10px]">{{ persa.blocco.classe }}</span>
      <span class="font-mono text-[10px] text-ink-soft">
        {{ orario }} · {{ persa.blocco.slot.length }}h · {{ persa.blocco.aula }}
      </span>
      <span
        v-if="persa.irrecuperabile"
        class="ml-auto font-mono text-[10px] uppercase tracking-wider text-fault"
      >
        ora persa
      </span>
    </header>

    <div class="grid divide-line md:grid-cols-2 md:divide-x">
      <section class="px-3 py-2">
        <h3 class="legend mb-1.5 text-[9px] text-ink-soft">chi può sostituirlo, qui e ora</h3>
        <ul v-if="persa.sostituti.length" class="space-y-1">
          <li
            v-for="sostituto in persa.sostituti"
            :key="sostituto.docente"
            class="flex items-center justify-between gap-2 text-[11px]"
          >
            <span class="min-w-0 flex-1 truncate">{{ personName(sostituto.docente) }}</span>
            <span class="shrink-0 font-mono text-[9.5px] text-ink-soft">
              {{ sostituto.oreQuellaSettimana }}h quel giorno
            </span>
            <Button size="sm" class="shrink-0" @click="emit('sostituisci', sostituto.docente)">
              applica
            </Button>
          </li>
        </ul>
        <p v-else class="text-[11px] text-ink-soft">
          Nessun altro docente di {{ persa.blocco.materia }} è libero in quelle ore.
        </p>
      </section>

      <section class="px-3 py-2">
        <h3 class="legend mb-1.5 text-[9px] text-ink-soft">quando recuperarla, con lo stesso docente</h3>
        <ul v-if="persa.recuperi.length" class="space-y-1">
          <li
            v-for="(recupero, indice) in persa.recuperi"
            :key="recupero.data + recupero.slot[0]"
            class="flex items-center justify-between gap-2 text-[11px]"
          >
            <span class="min-w-0 flex-1 truncate">
              {{ weekdayLabel(recupero.indiceGiorno) }}
              {{ shortDate(recupero.data) }}
              <span class="font-mono text-[9.5px] text-ink-soft">{{ fascia(recupero.slot) }}</span>
            </span>
            <span class="shrink-0 font-mono text-[9.5px] text-ink-soft">
              +{{ recupero.giorniDiDistanza }} gg · {{ recupero.aula }}
            </span>
            <Button size="sm" class="shrink-0" @click="emit('recupera', indice)">applica</Button>
          </li>
        </ul>
        <p v-else class="text-[11px] text-ink-soft">
          Nessun giorno libero entro la fine del corso: la classe è già piena ogni giorno utile.
        </p>
      </section>
    </div>
  </article>
</template>
