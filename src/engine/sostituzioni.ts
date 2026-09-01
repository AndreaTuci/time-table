import type { Lezione, Modello } from './types'

/**
 * "Il tal docente il tal giorno non c'e'": chi lo sostituisce e quando si recupera la lezione.
 *
 * Le due risposte non sono alternative ma complementari. Un sostituto salva l'ora al suo posto,
 * senza toccare il resto dell'orario. Un recupero sposta la lezione a un giorno libero, e lo fa
 * mantenendo il titolare. La scelta e' di chi gestisce la scuola, non del motore: qui si offrono
 * entrambe con il loro costo.
 */

/** Una lezione continuativa: piu' ore di fila della stessa materia, nello stesso giorno. */
export interface BloccoLezione {
  classe: string
  materia: string
  docente: string
  aula: string
  data: string
  indiceGiorno: number
  slot: number[]
}

export interface Sostituto {
  docente: string
  /** Ore gia' insegnate da questo docente nella settimana della lezione: a parita', il meno carico. */
  oreQuellaSettimana: number
}

export interface Recupero {
  data: string
  slot: number[]
  aula: string
  /** Quanti giorni dopo la lezione persa: il piu' vicino e' quasi sempre il migliore. */
  giorniDiDistanza: number
}

export interface LezionePersa {
  blocco: BloccoLezione
  sostituti: Sostituto[]
  recuperi: Recupero[]
  /** Vero se non esiste ne un sostituto ne un recupero: quell'ora e' semplicemente persa. */
  irrecuperabile: boolean
}

const RECUPERI_PROPOSTI = 5

/** Raggruppa le ore consecutive della stessa materia in un'unica lezione. */
export function blocchiDi(lezioni: Lezione[], docente: string, data: string): BloccoLezione[] {
  const delGiorno = lezioni
    .filter((l) => l.docente === docente && l.data === data)
    .sort((a, b) => a.classe.localeCompare(b.classe) || a.indiceSlot - b.indiceSlot)

  const blocchi: BloccoLezione[] = []
  for (const lezione of delGiorno) {
    const ultimo = blocchi[blocchi.length - 1]
    const consecutiva =
      ultimo &&
      ultimo.classe === lezione.classe &&
      ultimo.materia === lezione.materia &&
      lezione.indiceSlot === ultimo.slot[ultimo.slot.length - 1] + 1
    if (consecutiva) ultimo.slot.push(lezione.indiceSlot)
    else blocchi.push({ ...lezione, slot: [lezione.indiceSlot] })
  }
  return blocchi
}

interface Indice {
  /** Chi e' impegnato in un certo istante. */
  docenteOccupato: Set<string>
  aulaOccupata: Set<string>
  /** Posizioni gia' occupate da ogni classe, per data. */
  posizioniClasse: Map<string, number[]>
  oreMateriaGiorno: Map<string, number>
}

function indicizza(modello: Modello, lezioni: Lezione[]): Indice {
  const indice: Indice = {
    docenteOccupato: new Set(),
    aulaOccupata: new Set(),
    posizioniClasse: new Map(),
    oreMateriaGiorno: new Map(),
  }
  for (const l of lezioni) {
    indice.docenteOccupato.add(`${l.data}|${l.indiceSlot}|${l.docente}`)
    indice.aulaOccupata.add(`${l.data}|${l.indiceSlot}|${l.aula}`)
    const k = `${l.classe}|${l.data}`
    indice.posizioniClasse.set(k, [...(indice.posizioniClasse.get(k) ?? []), modello.slotUtili.indexOf(l.indiceSlot)])
    const km = `${l.classe}|${l.materia}|${l.data}`
    indice.oreMateriaGiorno.set(km, (indice.oreMateriaGiorno.get(km) ?? 0) + 1)
  }
  return indice
}

/** Chi puo' coprire questa lezione al posto del titolare, senza spostare nulla. */
function sostitutiPer(
  modello: Modello,
  blocco: BloccoLezione,
  indice: Indice,
  lezioni: Lezione[],
  assente: string
): Sostituto[] {
  const settimana = lezioni.filter((l) => l.data === blocco.data)
  return modello.docenti
    .filter((d) => d.id !== assente && d.materie.includes(blocco.materia))
    .filter((d) =>
      blocco.slot.every(
        (s) => d.disponibile[blocco.indiceGiorno][s] && !indice.docenteOccupato.has(`${blocco.data}|${s}|${d.id}`)
      )
    )
    .map((d) => ({
      docente: d.id,
      oreQuellaSettimana: settimana.filter((l) => l.docente === d.id).length,
    }))
    .sort((a, b) => a.oreQuellaSettimana - b.oreQuellaSettimana || a.docente.localeCompare(b.docente))
}

/** Le posizioni contigue a una giornata gia' avviata: davanti o in coda, mai un buco in mezzo. */
function posizioniContigue(occupate: number[], durata: number, totaleSlot: number): number[][] {
  if (occupate.length === 0) {
    return Array.from({ length: Math.max(totaleSlot - durata + 1, 0) }, (_, p) =>
      Array.from({ length: durata }, (_, i) => p + i)
    )
  }
  const primo = Math.min(...occupate)
  const ultimo = Math.max(...occupate)
  const candidate: number[][] = []
  if (primo - durata >= 0) candidate.push(Array.from({ length: durata }, (_, i) => primo - durata + i))
  if (ultimo + durata < totaleSlot) candidate.push(Array.from({ length: durata }, (_, i) => ultimo + 1 + i))
  return candidate
}

/** Dove si puo' recuperare una lezione persa, mantenendo il titolare e senza spostare altro. */
function recuperiPer(
  modello: Modello,
  blocco: BloccoLezione,
  indice: Indice,
  giorniUtili: { data: string; indiceGiorno: number }[]
): Recupero[] {
  const classe = modello.classi[blocco.classe]
  const materia = modello.materie[blocco.materia]
  const docente = modello.docenti.find((d) => d.id === blocco.docente)
  if (!docente) return []

  const durata = blocco.slot.length
  const tipoCasa = modello.aule.find((a) => a.id === classe.aulaCasa)?.tipo
  const auleAmmesse =
    materia.tipoAula === tipoCasa
      ? [classe.aulaCasa]
      : modello.aule.filter((a) => a.tipo === materia.tipoAula).map((a) => a.id)

  const recuperi: Recupero[] = []
  const futuri = giorniUtili.filter((g) => g.data > blocco.data && g.data <= classe.dataFine)

  for (const giorno of futuri) {
    if (recuperi.length >= RECUPERI_PROPOSTI) break
    const occupate = indice.posizioniClasse.get(`${blocco.classe}|${giorno.data}`) ?? []
    if (occupate.length + durata > classe.oreGiornoMax) continue
    const oreMateria = indice.oreMateriaGiorno.get(`${blocco.classe}|${blocco.materia}|${giorno.data}`) ?? 0
    if (oreMateria + durata > materia.maxOreGiorno) continue

    for (const posizioni of posizioniContigue(occupate, durata, modello.slotUtili.length)) {
      const slot = posizioni.map((p) => modello.slotUtili[p])
      const docenteLibero = slot.every(
        (s) => docente.disponibile[giorno.indiceGiorno][s] && !indice.docenteOccupato.has(`${giorno.data}|${s}|${docente.id}`)
      )
      if (!docenteLibero) continue
      const aula = auleAmmesse.find((a) => slot.every((s) => !indice.aulaOccupata.has(`${giorno.data}|${s}|${a}`)))
      if (!aula) continue

      recuperi.push({
        data: giorno.data,
        slot,
        aula,
        giorniDiDistanza: giorniUtili.filter((g) => g.data > blocco.data && g.data <= giorno.data).length,
      })
      break
    }
  }
  return recuperi
}

/**
 * La domanda del capo d'istituto: "il tal docente domani non c'e', cosa succede?".
 * Per ogni lezione saltata restituisce chi puo' coprirla sul posto e dove si puo' recuperarla.
 */
export function analizzaAssenza(
  modello: Modello,
  lezioni: Lezione[],
  giorniUtili: { data: string; indiceGiorno: number }[],
  docente: string,
  data: string
): LezionePersa[] {
  const indice = indicizza(modello, lezioni)
  return blocchiDi(lezioni, docente, data).map((blocco) => {
    const sostituti = sostitutiPer(modello, blocco, indice, lezioni, docente)
    const recuperi = recuperiPer(modello, blocco, indice, giorniUtili)
    return { blocco, sostituti, recuperi, irrecuperabile: sostituti.length === 0 && recuperi.length === 0 }
  })
}

/** I giorni in cui un docente ha almeno una lezione: la demo li offre come date selezionabili. */
export function giorniConLezione(lezioni: Lezione[], docente: string): string[] {
  return [...new Set(lezioni.filter((l) => l.docente === docente).map((l) => l.data))].sort()
}
