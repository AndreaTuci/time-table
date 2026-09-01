import { chiave } from './giornata'
import {
  capacitaResidua,
  componiGiornata,
  oreDocenteNeiGiorni,
  type BloccoCollocato,
  type Budget,
  type Contesto,
  type Residuo,
  type VincoliGiorno,
} from './giornata'
import type { Modello } from './types'

/**
 * Percorre i giorni di una settimana chiedendo a `componiGiornata` di comporli.
 *
 * Il suo lavoro vero e' calcolare, giorno per giorno, quante ore ciascuna classe DEVE fare
 * perche' il residuo settimanale stia ancora nei giorni che restano. Senza questi limiti il
 * motore riempirebbe i primi giorni e si troverebbe l'ultimo impossibile.
 */

/** Ordini di visita dei giorni da provare prima di dichiarare fallita la settimana. */
const TENTATIVI_MASSIMI = 5

/** Quante collocazioni esplorare al massimo per una settimana, prima di arrendersi. */
const NODI_PER_SETTIMANA = 2_000_000

export interface EsitoSettimana {
  perGiorno: Map<number, BloccoCollocato[]>
  tentativiUsati: number
}

/**
 * Che materia occupava ogni posizione della giornata la settimana scorsa, per giorno e classe.
 * E' la memoria che rende l'orario "tipo" e, insieme, la potatura piu' efficace della ricerca.
 */
export type Abitudini = Map<number, Map<string, Map<number, string>>>

function oreResidue(residuo: Residuo): number {
  return [...residuo.values()].flat().reduce((a, b) => a + b, 0)
}

/**
 * Quante ore la classe deve fare oggi. Il minimo non e' una preferenza: se restano 34 ore e
 * quattro giorni da 8, oggi se ne devono fare almeno 2. Al di sopra di quel vincolo si punta
 * comunque a giornate piene, per non lasciare code di mezze giornate a fine corso.
 */
function vincoliDelGiorno(modello: Modello, classe: string, residuo: Residuo, giorniRestanti: number): VincoliGiorno {
  const dati = modello.classi[classe]
  const rimaste = oreResidue(residuo)
  if (rimaste === 0 || giorniRestanti === 0) return { oreMin: 0, oreMax: 0 }

  const necessarie = rimaste - (giorniRestanti - 1) * dati.oreGiornoMax
  const oreMax = Math.min(dati.oreGiornoMax, rimaste)
  const oreMin = Math.max(Math.max(necessarie, 0), Math.min(dati.oreGiornoMin, rimaste))
  return { oreMin: Math.min(oreMin, oreMax), oreMax }
}

/**
 * I giorni piu' poveri di docenti si compongono per primi.
 *
 * Sembra controintuitivo ma e' il contrario: l'ultimo giorno visitato deve assorbire tutto cio'
 * che avanza, e chiedere questo al venerdi — quando meta' dei titolari non c'e' — condanna la
 * ricerca. Lasciando per ultimo il giorno piu' ricco, il residuo trova sempre dove sistemarsi.
 */
function ordineGiorni(ctx: Contesto, classi: string[], giorni: number[], tentativo: number): number[] {
  const ricchezza = (giorno: number) =>
    classi.reduce((totale, classe) => {
      const materie = ctx.modello.classi[classe]?.materie ?? []
      return totale + materie.reduce((somma, materia) => {
        const titolare = ctx.titolarePer.get(chiave(classe, materia))
        return somma + (titolare ? (ctx.oreLibere.get(titolare.docente)?.[giorno] ?? 0) : 0)
      }, 0)
    }, 0)

  const perDifficolta = [...giorni].sort((a, b) => ricchezza(a) - ricchezza(b) || a - b)
  // I tentativi successivi ruotano l'ordine, per esplorare spartizioni diverse.
  const rotazione = tentativo % Math.max(perDifficolta.length, 1)
  return [...perDifficolta.slice(rotazione), ...perDifficolta.slice(0, rotazione)]
}

export function risolviSettimana(
  modello: Modello,
  ctx: Contesto,
  fabbisogno: Map<string, Residuo>,
  giorniPerClasse: Map<string, number[]>,
  abitudini: Abitudini
): EsitoSettimana | null {
  const classi = [...fabbisogno.keys()].sort()
  const tuttiIGiorni = [...new Set([...giorniPerClasse.values()].flat())].sort((a, b) => a - b)

  for (let tentativo = 0; tentativo < TENTATIVI_MASSIMI; tentativo++) {
    const daVisitare = ordineGiorni(ctx, classi, tuttiIGiorni, tentativo)
    const budget: Budget = { nodi: NODI_PER_SETTIMANA }

    const dalGiorno = (
      indice: number,
      residuo: Map<string, Residuo>
    ): Map<number, BloccoCollocato[]> | null => {
      if (indice === daVisitare.length) {
        const finito = [...residuo.values()].every((r) => oreResidue(r) === 0)
        return finito ? new Map() : null
      }
      const giorno = daVisitare[indice]
      if (!residuoAncoraCollocabile(ctx, classi, residuo, giorniPerClasse, daVisitare, indice)) return null
      const vincoli = vincoliDelleClassi(modello, classi, residuo, giorniPerClasse, daVisitare, indice)

      return componiGiornata(
        ctx, giorno, classi, residuo, vincoli,
        abitudini.get(giorno) ?? new Map(),
        budget,
        (blocchi, residuoDopo) => {
          const resto = dalGiorno(indice + 1, residuoDopo)
          if (!resto) return null
          resto.set(giorno, blocchi)
          return resto
        }
      )
    }

    const perGiorno = dalGiorno(0, fabbisogno)
    if (perGiorno) return { perGiorno, tentativiUsati: tentativo + 1 }
  }
  return null
}

function vincoliDelleClassi(
  modello: Modello,
  classi: string[],
  residuo: Map<string, Residuo>,
  giorniPerClasse: Map<string, number[]>,
  daVisitare: number[],
  indice: number
): Map<string, VincoliGiorno> {
  const giorno = daVisitare[indice]
  const vincoli = new Map<string, VincoliGiorno>()
  for (const classe of classi) {
    const giorniClasse = giorniPerClasse.get(classe) ?? []
    if (!giorniClasse.includes(giorno)) {
      vincoli.set(classe, { oreMin: 0, oreMax: 0 })
      continue
    }
    const restanti = daVisitare.slice(indice).filter((g) => giorniClasse.includes(g)).length
    vincoli.set(classe, vincoliDelGiorno(modello, classe, residuo.get(classe)!, restanti))
  }
  return vincoli
}

/**
 * Verifica che il residuo possa ancora entrare nei giorni rimasti. Tre limiti superiori, dal piu'
 * economico al piu' selettivo. Nessuno promette che una soluzione esista: bocciano pero' i rami
 * gia' condannati, ed e' li' che si spendeva quasi tutto il tempo di ricerca.
 */
function residuoAncoraCollocabile(
  ctx: Contesto,
  classi: string[],
  residuo: Map<string, Residuo>,
  giorniPerClasse: Map<string, number[]>,
  daVisitare: number[],
  indice: number
): boolean {
  const restantiDi = (classe: string) => {
    const giorniClasse = giorniPerClasse.get(classe) ?? []
    return daVisitare.slice(indice).filter((g) => giorniClasse.includes(g))
  }

  // 1. Ogni materia deve entrare nelle fasce libere del suo titolare.
  for (const classe of classi) {
    const restanti = restantiDi(classe)
    for (const [materia, durate] of residuo.get(classe) ?? []) {
      if (durate.length === 0) continue
      if (durate.length > capacitaResidua(ctx, classe, materia, durate[0], restanti)) return false
    }
  }

  // 2. Un docente non puo' stare in due classi insieme: le ore che gli restano su TUTTI i suoi
  //    incarichi devono stare nelle ore in cui e' libero. E' il limite che coglie le contese vere.
  const orePerDocente = new Map<string, number>()
  const giorniPerDocente = new Map<string, Set<number>>()
  for (const classe of classi) {
    const restanti = restantiDi(classe)
    for (const [materia, durate] of residuo.get(classe) ?? []) {
      const titolare = ctx.titolarePer.get(chiave(classe, materia))
      if (!titolare || durate.length === 0) continue
      const ore = durate.reduce((a, b) => a + b, 0)
      orePerDocente.set(titolare.docente, (orePerDocente.get(titolare.docente) ?? 0) + ore)
      const giorni = giorniPerDocente.get(titolare.docente) ?? new Set<number>()
      for (const g of restanti) giorni.add(g)
      giorniPerDocente.set(titolare.docente, giorni)
    }
  }
  for (const [docente, ore] of orePerDocente) {
    const giorni = [...(giorniPerDocente.get(docente) ?? [])]
    if (ore > oreDocenteNeiGiorni(ctx, docente, giorni)) return false
  }

  // 3. Un laboratorio ospita una classe per volta: le ore che tutte le classi devono ancora
  //    farci dentro non possono superare i posti-ora che restano.
  const orePerTipo = new Map<string, number>()
  const giorniPerTipo = new Map<string, Set<number>>()
  for (const classe of classi) {
    const restanti = restantiDi(classe)
    for (const [materia, durate] of residuo.get(classe) ?? []) {
      if (durate.length === 0) continue
      const tipo = ctx.modello.materie[materia].tipoAula
      orePerTipo.set(tipo, (orePerTipo.get(tipo) ?? 0) + durate.reduce((a, b) => a + b, 0))
      const giorni = giorniPerTipo.get(tipo) ?? new Set<number>()
      for (const g of restanti) giorni.add(g)
      giorniPerTipo.set(tipo, giorni)
    }
  }
  for (const [tipo, ore] of orePerTipo) {
    const aule = (ctx.aulePerTipo.get(tipo) ?? []).length
    const postiOra = aule * (giorniPerTipo.get(tipo)?.size ?? 0) * ctx.slotUtili.length
    if (ore > postiOra) return false
  }

  return true
}
