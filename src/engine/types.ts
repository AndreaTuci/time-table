/** Modello normalizzato del problema. Nessuna dipendenza da Vue o dal DOM. */

export const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven'] as const
export type Giorno = (typeof GIORNI)[number]

/** Indice 0-4 nella settimana lavorativa. `getUTCDay()` restituisce 1-5 per lun-ven. */
export type IndiceGiorno = 0 | 1 | 2 | 3 | 4

export interface Docente {
  id: string
  nome: string
  materie: string[]
  /** `disponibile[indiceGiorno][indiceSlot]`. Include gli slot di pausa, sempre falsi. */
  disponibile: boolean[][]
  oreSettimanaliDisponibili: number
}

export interface Aula {
  id: string
  tipo: string
}

export interface Materia {
  id: string
  oreTotali: number
  tipoAula: string
  /** Durata minima di una lezione consecutiva. Le materie di laboratorio usano blocchi lunghi. */
  bloccoOre: number
  /** Tetto giornaliero specifico della materia: un laboratorio puo' prendersi l'intera giornata. */
  maxOreGiorno: number
}

export interface Classe {
  id: string
  dataInizio: string
  dataFine: string
  /** Aula usata per tutte le materie di tipo AULA: ci si sposta solo per i laboratori. */
  aulaCasa: string
  oreGiornoMin: number
  oreGiornoMax: number
  materie: string[]
}

export interface Chiusura {
  /** Prima data chiusa, inclusa. */
  dal: string
  /** Ultima data chiusa, inclusa. */
  al: string
  motivo: string
}

export interface Modello {
  /** Tutti gli slot della giornata, pausa pranzo compresa. L'indice e' la chiave usata ovunque. */
  slot: string[]
  /** Indici di `slot` realmente utilizzabili: esclude la pausa pranzo. */
  slotUtili: number[]
  pausaPranzo: string
  docenti: Docente[]
  aule: Aula[]
  materie: Record<string, Materia>
  classi: Record<string, Classe>
  chiusure: Chiusura[]
}

/** Una lezione collocata su una data reale: l'output del motore. */
export interface Lezione {
  /** Data ISO `YYYY-MM-DD`. */
  data: string
  indiceGiorno: IndiceGiorno
  indiceSlot: number
  classe: string
  materia: string
  docente: string
  aula: string
  /** Vero se nata dalla coda di riequilibrio e non dall'orario tipo. */
  fuoriTemplate: boolean
}

/** Un blocco dell'orario tipo settimanale: la stessa lezione ripetuta ogni settimana. */
export interface Blocco {
  classe: string
  materia: string
  indiceGiorno: IndiceGiorno
  slotInizio: number
  durata: number
  docente: string
  aula: string
}
