import type { Docente, Modello } from './types'
import type { Titolare } from './titolari'

/**
 * Il cuore del motore: compone la giornata di tutte le classi, un giorno della settimana per volta.
 *
 * Sceglie insieme QUALI lezioni fare e IN CHE ORDINE, perche' le due decisioni non si possono
 * separare: un blocco entra in una certa posizione solo se il suo docente titolare e' libero
 * proprio a quell'ora. Un primo strato che scegliesse i blocchi senza sapere dove finiranno
 * consegnerebbe al secondo giornate impossibili da ordinare.
 *
 * I giorni della settimana restano invece indipendenti fra loro: due lezioni confliggono solo
 * se cadono nello stesso giorno alla stessa ora. Cinque problemi piccoli invece di uno grande.
 *
 * La giornata di una classe e' contigua — niente ore-buco — ma non deve cominciare alle 08.00:
 * puo' scorrere piu' tardi, ed e' cio' che rende utilizzabile un docente disponibile solo di
 * pomeriggio.
 *
 * Una singola lezione non scavalca pero' la pausa pranzo. Tolta la pausa dall'elenco degli slot
 * utili, le 12.00-13.00 e le 14.00-15.00 diventano adiacenti NELL'ELENCO pur non essendolo
 * NELL'OROLOGIO: senza un controllo esplicito il motore le userebbe per un blocco da due ore
 * consecutive che consecutive non sono, e la regola dei blocchi minimi verrebbe aggirata.
 */

export interface BloccoGiorno {
  classe: string
  materia: string
  durata: number
}

export interface BloccoCollocato extends BloccoGiorno {
  docente: string
  aula: string
  slotInizio: number
  slot: number[]
}

export interface Contesto {
  modello: Modello
  slotUtili: number[]
  docentiPerId: Map<string, Docente>
  titolarePer: Map<string, Titolare>
  aulePerTipo: Map<string, string[]>
  tipoDiAula: Map<string, string>
  /** Quanti slot utili cadono prima della pausa pranzo: la lezione non puo' scavalcarla. */
  morningCount: number
  /** Fascia contigua piu' lunga di ogni docente, giorno per giorno. Serve a potare la ricerca. */
  fasciaMassima: Map<string, number[]>
  /** Ore totali libere di ogni docente, giorno per giorno. Anche questa serve a potare. */
  oreLibere: Map<string, number[]>
}

export function chiave(classe: string, materia: string): string {
  return `${classe}|${materia}`
}

export function contestoDa(modello: Modello, titolari: Titolare[]): Contesto {
  const aulePerTipo = new Map<string, string[]>()
  for (const aula of modello.aule) {
    aulePerTipo.set(aula.tipo, [...(aulePerTipo.get(aula.tipo) ?? []), aula.id])
  }
  return {
    modello,
    slotUtili: modello.slotUtili,
    docentiPerId: new Map(modello.docenti.map((d) => [d.id, d])),
    titolarePer: new Map(titolari.map((t) => [chiave(t.classe, t.materia), t])),
    aulePerTipo,
    tipoDiAula: new Map(modello.aule.map((a) => [a.id, a.tipo])),
    morningCount: modello.slotUtili.filter((s) => s < modello.slot.indexOf(modello.pausaPranzo))
      .length,
    fasciaMassima: new Map(modello.docenti.map((d) => [d.id, fasceMassimeDi(d, modello.slotUtili)])),
    oreLibere: new Map(
      modello.docenti.map((d) => [
        d.id,
        d.disponibile.map((giorno) => modello.slotUtili.filter((s) => giorno[s]).length),
      ])
    ),
  }
}

/** Per ogni giorno, quante ore consecutive al massimo questo docente puo' coprire. */
function fasceMassimeDi(docente: Docente, slotUtili: number[]): number[] {
  return docente.disponibile.map((giorno) => {
    let massima = 0
    let corrente = 0
    for (const slot of slotUtili) {
      corrente = giorno[slot] ? corrente + 1 : 0
      massima = Math.max(massima, corrente)
    }
    return massima
  })
}

/**
 * Quante lezioni di una materia possono ancora entrare nei giorni che restano.
 * E' un limite superiore, non una promessa: se il residuo lo supera la ricerca e' gia' persa e
 * conviene accorgersene subito invece di scoprirlo in fondo alla ricorsione.
 */
/** Ore in cui un docente e' libero nei giorni indicati: non puo' insegnarne di piu'. */
export function oreDocenteNeiGiorni(ctx: Contesto, docente: string, giorni: number[]): number {
  const perGiorno = ctx.oreLibere.get(docente) ?? []
  return giorni.reduce((totale, g) => totale + (perGiorno[g] ?? 0), 0)
}

export function capacitaResidua(
  ctx: Contesto,
  classe: string,
  materia: string,
  durata: number,
  giorniRestanti: number[]
): number {
  const titolare = ctx.titolarePer.get(chiave(classe, materia))
  const fasce = titolare && ctx.fasciaMassima.get(titolare.docente)
  if (!fasce) return 0
  const perGiorno = Math.floor(ctx.modello.materie[materia].maxOreGiorno / durata)
  return giorniRestanti.reduce(
    (totale, g) => totale + Math.min(perGiorno, Math.floor((fasce[g] ?? 0) / durata)),
    0
  )
}

/** Quante lezioni di ogni materia restano da collocare a una classe in questa settimana. */
export type Fabbisogno = Map<string, { materia: string; durata: number; quante: number }[]>

export interface VincoliGiorno {
  /** Ore minime e massime che la classe deve fare oggi, gia' dedotte dal residuo settimanale. */
  oreMin: number
  oreMax: number
}

interface StatoGiorno {
  docentiOccupati: Map<number, Set<string>>
  auleOccupate: Map<number, Set<string>>
  budget: Budget
}

function aulaLibera(
  ctx: Contesto,
  blocco: BloccoGiorno,
  slot: number[],
  stato: StatoGiorno
): string | null {
  const materia = ctx.modello.materie[blocco.materia]
  const classe = ctx.modello.classi[blocco.classe]
  // Le materie d'aula si fanno nell'aula casa: e' esclusiva della classe, non si contende mai.
  if (materia.tipoAula === ctx.tipoDiAula.get(classe.aulaCasa)) return classe.aulaCasa
  const impegnate = new Set(slot.flatMap((s) => [...(stato.auleOccupate.get(s) ?? [])]))
  return (ctx.aulePerTipo.get(materia.tipoAula) ?? []).find((a) => !impegnate.has(a)) ?? null
}

/** Prova a mettere una lezione a partire da una posizione: restituisce la collocazione o null. */
function provaBlocco(
  ctx: Contesto,
  indiceGiorno: number,
  classe: string,
  materia: string,
  durata: number,
  posizione: number,
  stato: StatoGiorno
): BloccoCollocato | null {
  const slot = ctx.slotUtili.slice(posizione, posizione + durata)
  if (slot.length < durata) return null
  // Ore davvero consecutive: gli indici reali non devono saltare la pausa pranzo.
  if (slot.some((s, i) => i > 0 && s !== slot[i - 1] + 1)) return null

  const titolare = ctx.titolarePer.get(chiave(classe, materia))
  const docente = titolare && ctx.docentiPerId.get(titolare.docente)
  if (!docente) return null
  const libero = slot.every(
    (s) => docente.disponibile[indiceGiorno][s] && !stato.docentiOccupati.get(s)?.has(docente.id)
  )
  if (!libero) return null

  const blocco = { classe, materia, durata }
  const aula = aulaLibera(ctx, blocco, slot, stato)
  if (!aula) return null
  return { ...blocco, docente: docente.id, aula, slotInizio: slot[0], slot }
}

function segna(stato: StatoGiorno, blocco: BloccoCollocato, occupa: boolean): void {
  for (const s of blocco.slot) {
    const docenti = stato.docentiOccupati.get(s) ?? new Set<string>()
    const aule = stato.auleOccupate.get(s) ?? new Set<string>()
    if (occupa) {
      docenti.add(blocco.docente)
      aule.add(blocco.aula)
    } else {
      docenti.delete(blocco.docente)
      aule.delete(blocco.aula)
    }
    stato.docentiOccupati.set(s, docenti)
    stato.auleOccupate.set(s, aule)
  }
}

/**
 * Quanto la ricerca puo' ancora spendere. Due limiti perche' misurano cose diverse: i nodi
 * proteggono da un ramo combinatorio esploso, la scadenza protegge dall'unico caso che conta
 * davvero per chi guarda lo schermo — un'istanza infattibile, su cui il motore cercherebbe a
 * vuoto finche' non finiscono i nodi di OGNI settimana e di OGNI tentativo.
 */
export interface Budget {
  nodi: number
  /** Istante oltre il quale ci si arrende, in millisecondi epoch. */
  scadenza: number
  /** Vero quando ci si e' arresi per tempo scaduto e non per nodi esauriti. */
  scaduto: boolean
  /** Nodi spesi da inizio settimana. Sta QUI e non sulla singola giornata: un contatore che si
   *  azzera a ogni giornata non raggiunge mai la soglia, e l'orologio non verrebbe mai letto. */
  spesi: number
}

/** Ogni quanti nodi si guarda l'orologio: leggerlo a ogni nodo costerebbe piu' della ricerca. */
const NODI_FRA_CONTROLLI_TEMPO = 4096

export function budgetEsaurito(budget: Budget): boolean {
  if (budget.nodi <= 0) return true
  budget.nodi--
  budget.spesi++
  if (budget.spesi % NODI_FRA_CONTROLLI_TEMPO !== 0) return false
  if (Date.now() < budget.scadenza) return false
  budget.scaduto = true
  budget.nodi = 0
  return true
}

/** Le lezioni che restano da collocare a una classe in questa settimana, per materia. */
export type Residuo = Map<string, number[]>

function clona(residuo: Map<string, Residuo>): Map<string, Residuo> {
  return new Map([...residuo].map(([classe, perMateria]) =>
    [classe, new Map([...perMateria].map(([m, durate]) => [m, [...durate]]))]
  ))
}

/**
 * Riempie la giornata di una classe e, quando e' completa, passa il testimone alla classe
 * successiva tramite `prosegui`. Se le classi successive non chiudono, si torna indietro e si
 * prova una giornata diversa per questa: e' cosi' che si sciolgono le contese sui laboratori.
 */
function riempiClasse<T>(
  ctx: Contesto,
  indiceGiorno: number,
  classe: string,
  residuo: Residuo,
  vincoli: VincoliGiorno,
  stato: StatoGiorno,
  abituali: Map<number, string>,
  prosegui: (giornata: BloccoCollocato[]) => T | null
): T | null {
  const posate: BloccoCollocato[] = []
  const oreMateriaOggi = new Map<string, number>()

  // Le materie il cui titolare ha oggi meno respiro si provano per prime: falliscono subito
  // invece di far scoprire il vicolo cieco in fondo alla ricorsione.
  const oreLibere = (materia: string) => {
    const titolare = ctx.titolarePer.get(chiave(classe, materia))
    const docente = titolare && ctx.docentiPerId.get(titolare.docente)
    return docente ? ctx.slotUtili.filter((s) => docente.disponibile[indiceGiorno][s]).length : 0
  }
  const perScarsita = [...residuo.keys()].sort((a, b) => oreLibere(a) - oreLibere(b) || a.localeCompare(b))

  /**
   * Prima si prova la materia che la settimana scorsa stava esattamente in questa posizione.
   * Serve a due cose insieme: rende l'orario riconoscibile settimana dopo settimana, ed e' anche
   * la potatura piu' efficace che abbiamo, perche' una soluzione simile a quella gia' trovata
   * si ritrova quasi subito invece di essere ricercata da zero.
   */
  const materieDa = (posizione: number) => {
    const abituale = abituali.get(posizione)
    if (!abituale || !residuo.has(abituale)) return perScarsita
    return [abituale, ...perScarsita.filter((m) => m !== abituale)]
  }

  const passo = (posizione: number, oreFatte: number): T | null => {
    if (budgetEsaurito(stato.budget)) return null
    if (oreFatte >= vincoli.oreMin) {
      const esito = prosegui([...posate])
      if (esito) return esito
    }

    for (const materia of materieDa(posizione)) {
      const durate = residuo.get(materia) ?? []
      for (const durata of [...new Set(durate)]) {
        if (oreFatte + durata > vincoli.oreMax) continue
        const oreMateria = oreMateriaOggi.get(materia) ?? 0
        if (oreMateria + durata > ctx.modello.materie[materia].maxOreGiorno) continue

        const blocco = provaBlocco(ctx, indiceGiorno, classe, materia, durata, posizione, stato)
        if (!blocco) continue

        durate.splice(durate.indexOf(durata), 1)
        oreMateriaOggi.set(materia, oreMateria + durata)
        posate.push(blocco)
        segna(stato, blocco, true)

        const esito = passo(posizione + durata, oreFatte + durata)
        if (esito) return esito

        segna(stato, blocco, false)
        posate.pop()
        oreMateriaOggi.set(materia, oreMateria)
        durate.push(durata)
      }
    }
    return null
  }

  const ultimaPartenza = ctx.slotUtili.length - vincoli.oreMin
  const durate = [...new Set([...residuo.values()].flat())]

  for (let partenza = 0; partenza <= ultimaPartenza; partenza++) {
    if (!partenzaPraticabile(ctx, partenza, durate, vincoli)) continue
    const esito = passo(partenza, 0)
    if (esito) return esito
    if (vincoli.oreMin === 0 && vincoli.oreMax === 0) break
  }
  return null
}

/**
 * Scarta subito le ore d'inizio da cui nessuna giornata valida puo' nascere.
 *
 * Poiche' una lezione non scavalca la pausa, una giornata che arriva al pomeriggio riempie la
 * mattina ESATTAMENTE dal punto di partenza alla pausa. Se quella lunghezza non e' componibile
 * con i blocchi disponibili, l'unica alternativa e' fermarsi in mattinata — e la mattina e' piu'
 * corta del minimo giornaliero. Provare comunque significa riempire mezza giornata per scoprire
 * il vicolo cieco in fondo: su questi dati taglia tre partenze su cinque.
 */
function partenzaPraticabile(
  ctx: Contesto,
  partenza: number,
  durate: number[],
  vincoli: VincoliGiorno
): boolean {
  // Giornata di solo pomeriggio: lunga al massimo quanto resta dopo la pausa.
  if (partenza >= ctx.morningCount) return ctx.slotUtili.length - partenza >= vincoli.oreMin

  // Per arrivare al pomeriggio la mattina va riempita per intero, da qui alla pausa.
  const mattina = ctx.morningCount - partenza
  if (componibile(mattina, durate)) return true

  // Altrimenti la giornata deve finire in mattinata, e deve gia' bastare.
  return mattina >= vincoli.oreMin
}

/** Se una lunghezza si puo' comporre come somma di blocchi disponibili. */
function componibile(lunghezza: number, durate: number[]): boolean {
  const possibile = new Array<boolean>(lunghezza + 1).fill(false)
  possibile[0] = true
  for (let n = 1; n <= lunghezza; n++) {
    possibile[n] = durate.some((d) => d <= n && possibile[n - d])
  }
  return possibile[lunghezza]
}

/**
 * Compone la giornata di tutte le classi insieme e passa il risultato a `prosegui`, che di norma
 * e' il giorno successivo della settimana. Se `prosegui` fallisce, la ricerca torna indietro e
 * prova un'altra giornata: e' cosi' che un lunedi diverso puo' salvare il martedi.
 */
export function componiGiornata<T>(
  ctx: Contesto,
  indiceGiorno: number,
  classi: string[],
  residuo: Map<string, Residuo>,
  vincoli: Map<string, VincoliGiorno>,
  abituali: Map<string, Map<number, string>>,
  budget: Budget,
  prosegui: (blocchi: BloccoCollocato[], residuo: Map<string, Residuo>) => T | null
): T | null {
  const residuoDiLavoro = clona(residuo)
  const stato: StatoGiorno = { docentiOccupati: new Map(), auleOccupate: new Map(), budget }

  const perClasse = (indice: number, giornata: BloccoCollocato[]): T | null => {
    if (indice === classi.length) return prosegui(giornata, residuoDiLavoro)
    const classe = classi[indice]
    return riempiClasse<T>(
      ctx, indiceGiorno, classe,
      residuoDiLavoro.get(classe) ?? new Map(),
      vincoli.get(classe) ?? { oreMin: 0, oreMax: 0 },
      stato,
      abituali.get(classe) ?? new Map(),
      (dellaClasse) => perClasse(indice + 1, [...giornata, ...dellaClasse])
    )
  }
  return perClasse(0, [])
}
