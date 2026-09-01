import type { Lezione } from '@/engine/types'

/**
 * I ritocchi fatti a mano dopo la generazione, applicati sopra l'orario prodotto dal motore.
 *
 * Non si rigenera. In una scuola vera l'orario e' gia' stato distribuito quando arriva la
 * telefonata del docente che non c'e': ricalcolare tutto cambierebbe la settimana a chiunque, ed
 * e' esattamente il motivo per cui esistono le sostituzioni. Qui si tocca solo cio' che salta.
 *
 * I ritocchi vivono separati dai dati di ingresso: non alterano cosa il generatore ha letto, e
 * infatti non rendono l'orario "vecchio". Sono una correzione dell'esito, non una modifica alla
 * domanda.
 */

export interface Sostituzione {
  tipo: 'sostituzione'
  classe: string
  materia: string
  data: string
  slot: number[]
  docenteOriginale: string
  docenteNuovo: string
}

export interface Recupero {
  tipo: 'recupero'
  classe: string
  materia: string
  docente: string
  /** Giorno e ore saltate. */
  data: string
  slot: number[]
  /** Dove la lezione viene rimessa. */
  nuovaData: string
  nuovoIndiceGiorno: number
  nuoviSlot: number[]
  nuovaAula: string
}

export type Variazione = Sostituzione | Recupero

/** Identifica una variazione senza bisogno di generare chiavi: due uguali non hanno senso. */
export function chiaveVariazione(v: Variazione): string {
  return `${v.tipo}|${v.classe}|${v.materia}|${v.data}|${v.slot.join(',')}`
}

function colpisce(lezione: Lezione, v: Variazione): boolean {
  return (
    lezione.classe === v.classe &&
    lezione.materia === v.materia &&
    lezione.data === v.data &&
    v.slot.includes(lezione.indiceSlot)
  )
}

/** L'orario con i ritocchi applicati, in ordine: ognuno vede l'esito di quelli precedenti. */
export function applicaVariazioni(lezioni: Lezione[], variazioni: Variazione[]): Lezione[] {
  let risultato = lezioni
  for (const variazione of variazioni) {
    risultato =
      variazione.tipo === 'sostituzione'
        ? applicaSostituzione(risultato, variazione)
        : applicaRecupero(risultato, variazione)
  }
  return risultato
}

function applicaSostituzione(lezioni: Lezione[], v: Sostituzione): Lezione[] {
  return lezioni.map((lezione) =>
    colpisce(lezione, v) && lezione.docente === v.docenteOriginale
      ? { ...lezione, docente: v.docenteNuovo, variazione: 'sostituzione' as const }
      : lezione
  )
}

function applicaRecupero(lezioni: Lezione[], v: Recupero): Lezione[] {
  const spostate = lezioni.filter((lezione) => colpisce(lezione, v))
  if (spostate.length === 0) return lezioni

  const rimaste = lezioni.filter((lezione) => !colpisce(lezione, v))
  const nuove: Lezione[] = v.nuoviSlot.slice(0, spostate.length).map((indiceSlot) => ({
    data: v.nuovaData,
    indiceGiorno: v.nuovoIndiceGiorno as Lezione['indiceGiorno'],
    indiceSlot,
    classe: v.classe,
    materia: v.materia,
    docente: v.docente,
    aula: v.nuovaAula,
    variazione: 'recupero',
  }))

  return [...rimaste, ...nuove].sort(
    (a, b) => a.data.localeCompare(b.data) || a.indiceSlot - b.indiceSlot || a.classe.localeCompare(b.classe)
  )
}
