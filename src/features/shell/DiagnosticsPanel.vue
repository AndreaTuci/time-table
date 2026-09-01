<script setup lang="ts">
import type { Problema } from '@/engine/diagnostica'

/**
 * Cosa non torna nei dati, detto prima che l'utente lo scopra da un orario mancante.
 *
 * Non e' una finestra modale: mentre si aggiustano i dati la si guarda di continuo, e una modale
 * andrebbe chiusa ogni volta. E' invece impossibile da mancare — bordo rosso, in cima, sopra le
 * schede — e ogni riga finisce con un rimedio numerico, non con un consiglio generico.
 */
defineProps<{ problems: Problema[]; excluded: string[] }>()
</script>

<template>
  <section
    v-if="problems.length"
    class="border-2 border-fault bg-panel"
    role="alert"
    aria-labelledby="diagnostica-titolo"
  >
    <header class="flex flex-wrap items-baseline gap-x-3 border-b border-fault/30 px-3 py-2">
      <h2 id="diagnostica-titolo" class="legend text-[11px] text-fault">
        {{ problems.length === 1 ? 'un problema nei dati' : `${problems.length} problemi nei dati` }}
      </h2>
      <p v-if="excluded.length" class="font-mono text-[10px] text-ink-soft">
        {{ excluded.join(', ') }}
        {{ excluded.length === 1 ? 'è stata esclusa' : 'sono state escluse' }} dalla generazione;
        le altre classi sono state pianificate normalmente.
      </p>
    </header>

    <ul class="divide-y divide-line">
      <li v-for="(problem, index) in problems" :key="index" class="px-3 py-2">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span
            class="font-mono text-[9px] uppercase tracking-wider"
            :class="problem.gravita === 'bloccante' ? 'text-fault' : 'text-caution'"
          >
            {{ problem.gravita }}
          </span>
          <span v-if="problem.classe" class="legend text-[10px]">{{ problem.classe }}</span>
          <span class="text-[11px] font-semibold">{{ problem.titolo }}</span>
        </div>
        <p class="mt-0.5 text-[11.5px]">{{ problem.messaggio }}</p>
        <p class="mt-0.5 text-[11.5px] text-signal">→ {{ problem.rimedio }}</p>
      </li>
    </ul>
  </section>
</template>
