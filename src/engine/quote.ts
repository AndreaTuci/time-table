import type { Materia } from './types'

/**
 * Da "ore totali" a "quante lezioni, lunghe quanto, in quale settimana".
 *
 * Due trappole, entrambe risolte qui:
 * 1. 100 ore in blocchi da 2h fanno 50 blocchi su 14 settimane, cioe' 3,57 a settimana.
 *    Una settimana identica a se stessa non puo' chiudere su un numero non intero.
 * 2. La settimana che perde un giorno per una festivita' non puo' ricevere le stesse ore
 *    delle altre: le comprimerebbe oltre il tetto giornaliero.
 * La spartizione e' quindi proporzionale ai GIORNI UTILI di ogni settimana, e i blocchi in
 * eccedenza vanno alla settimana che in quel momento e' piu' indietro rispetto al suo obiettivo.
 */

export interface QuoteMateria {
  materia: string
  /** Durata di ogni blocco, in ore. Quasi sempre tutte uguali. */
  durate: number[]
  /** Quanti blocchi collocare in ciascuna settimana. Somma = `durate.length`. */
  blocchiPerSettimana: number[]
}

/**
 * Divide le ore totali in blocchi lunghi almeno `bloccoOre` e mai piu' di `maxOreGiorno`,
 * il piu' uniformi possibile. 101 ore con blocchi da 2 diventano 49 blocchi da 2 piu' uno da 3,
 * non 50 blocchi da 2 piu' un'ora spaiata.
 */
export function dividiInBlocchi(materia: Materia): number[] {
  const { oreTotali, bloccoOre, maxOreGiorno } = materia
  if (oreTotali <= 0) throw new Error(`${materia.id}: ore totali devono essere positive`)
  if (bloccoOre <= 0) throw new Error(`${materia.id}: blocco_ore deve essere positivo`)
  if (bloccoOre > maxOreGiorno) {
    throw new Error(`${materia.id}: blocco_ore ${bloccoOre} supera max_ore_giorno ${maxOreGiorno}`)
  }
  if (oreTotali < bloccoOre) return [oreTotali]

  const numeroBlocchi = Math.floor(oreTotali / bloccoOre)
  const base = Math.floor(oreTotali / numeroBlocchi)
  const conUnOraInPiu = oreTotali - base * numeroBlocchi
  if (conUnOraInPiu > 0 && base + 1 > maxOreGiorno) {
    throw new Error(`${materia.id}: impossibile dividere ${oreTotali}h senza superare max_ore_giorno`)
  }
  return Array.from({ length: numeroBlocchi }, (_, i) => (i < conUnOraInPiu ? base + 1 : base))
}

interface Spartizione {
  indice: number
  durata: number
  perSettimana: number[]
  daCollocare: number
}

/** Quota intera garantita a ogni settimana, in proporzione ai suoi giorni utili. */
function quotaProporzionale(blocchi: number, giorniPerSettimana: number[]): number[] {
  const giorniTotali = giorniPerSettimana.reduce((a, b) => a + b, 0)
  if (giorniTotali === 0) throw new Error('Il calendario non contiene giorni utili')
  return giorniPerSettimana.map((giorni) => Math.floor((blocchi * giorni) / giorniTotali))
}

/**
 * Colloca i blocchi avanzati dall'arrotondamento. Ogni blocco va alla settimana con il maggior
 * ritardo rispetto al suo obiettivo di ore, cosi' il carico resta piatto invece di addensarsi.
 * Le materie con i blocchi piu' lunghi scelgono per prime: sono quelle che sbilanciano di piu'.
 * Una materia non riceve mai due eccedenze nella stessa settimana: spezzerebbe il ritmo.
 */
function collocaEccedenze(spartizioni: Spartizione[], obiettivoOre: number[], carico: number[]): void {
  const perImpatto = [...spartizioni].sort(
    (a, b) => b.durata - a.durata || b.daCollocare - a.daCollocare || a.indice - b.indice
  )
  for (const spartizione of perImpatto) {
    const giaServite = new Set<number>()
    for (let collocati = 0; collocati < spartizione.daCollocare; collocati++) {
      const scelta = settimanaPiuInRitardo(obiettivoOre, carico, giaServite)
      if (scelta === null) {
        throw new Error(`Non ci sono abbastanza settimane per collocare i blocchi di una materia`)
      }
      spartizione.perSettimana[scelta]++
      carico[scelta] += spartizione.durata
      giaServite.add(scelta)
    }
  }
}

function settimanaPiuInRitardo(
  obiettivoOre: number[],
  carico: number[],
  escluse: Set<number>
): number | null {
  let scelta: number | null = null
  for (let w = 0; w < obiettivoOre.length; w++) {
    if (escluse.has(w)) continue
    if (scelta === null || obiettivoOre[w] - carico[w] > obiettivoOre[scelta] - carico[scelta]) {
      scelta = w
    }
  }
  return scelta
}

/** Le quote di tutte le materie di una classe, gia' bilanciate fra loro settimana per settimana. */
export function quotePerClasse(materie: Materia[], giorniPerSettimana: number[]): QuoteMateria[] {
  const giorniTotali = giorniPerSettimana.reduce((a, b) => a + b, 0)
  const oreTotaliClasse = materie.reduce((ore, m) => ore + m.oreTotali, 0)
  const obiettivoOre = giorniPerSettimana.map((g) => (oreTotaliClasse * g) / giorniTotali)

  const durate = materie.map(dividiInBlocchi)
  const spartizioni: Spartizione[] = materie.map((_, indice) => {
    const perSettimana = quotaProporzionale(durate[indice].length, giorniPerSettimana)
    return {
      indice,
      durata: durate[indice][0],
      perSettimana,
      daCollocare: durate[indice].length - perSettimana.reduce((a, b) => a + b, 0),
    }
  })

  const carico = giorniPerSettimana.map((_, w) =>
    spartizioni.reduce((ore, s) => ore + s.perSettimana[w] * s.durata, 0)
  )
  collocaEccedenze(spartizioni, obiettivoOre, carico)

  return materie.map((materia, indice) => ({
    materia: materia.id,
    durate: durate[indice],
    blocchiPerSettimana: spartizioni[indice].perSettimana,
  }))
}
