import type { Aula, Chiusura, Classe, Docente, Materia, Modello } from './types'
import { GIORNI } from './types'

/** Errore di dati: raccoglie tutti i problemi invece di fermarsi al primo. */
export class ErroreDati extends Error {
  constructor(public problemi: string[]) {
    super(`Dati non validi:\n- ${problemi.join('\n- ')}`)
    this.name = 'ErroreDati'
  }
}

const PAUSA_PRANZO_DEFAULT = '13.00-14.00'
const ORE_GIORNO_MIN_DEFAULT = 6
const ORE_GIORNO_MAX_DEFAULT = 8
const TIPO_AULA_ORDINARIA = 'AULA'
const BLOCCO_ORE_AULA = 2
const BLOCCO_ORE_LABORATORIO = 4
const MAX_ORE_GIORNO_AULA = 4
const MAX_ORE_GIORNO_LABORATORIO = 8

type Grezzo = Record<string, any>

function slugDi(nome: string): string {
  return nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Il dataset esteso usa `materie: []`, l'esempio originale `materia: ""`. Entrambi validi. */
function materieDi(grezzo: Grezzo): string[] {
  if (Array.isArray(grezzo.materie)) return grezzo.materie
  if (typeof grezzo.materia === 'string') return [grezzo.materia]
  return []
}

function slotDi(grezzo: Grezzo): string[] {
  const dichiarati = grezzo.configurazione?.slot
  if (Array.isArray(dichiarati) && dichiarati.length > 0) return dichiarati
  const primoDocente = grezzo.insegnanti?.[0]
  const disponibilita = primoDocente && Object.values(primoDocente)[0]
  const primoGiorno = (disponibilita as Grezzo)?.disponibilita?.[GIORNI[0]]
  if (!primoGiorno) throw new ErroreDati(['Impossibile dedurre gli slot orari dai dati'])
  return Object.keys(primoGiorno)
}

function normalizzaDocenti(grezzo: Grezzo, slot: string[], problemi: string[]): Docente[] {
  const insegnanti = grezzo.insegnanti
  if (!Array.isArray(insegnanti)) {
    problemi.push('`insegnanti` mancante o non e un elenco')
    return []
  }
  return insegnanti.map((voce: Grezzo, i: number) => {
    const coppie = Object.entries(voce)
    if (coppie.length !== 1) problemi.push(`Insegnante #${i + 1}: atteso un solo nome per voce`)
    const [nome, dati] = coppie[0] as [string, Grezzo]

    const disponibile = GIORNI.map((giorno) => {
      const oreGiorno = dati.disponibilita?.[giorno]
      if (!oreGiorno) {
        problemi.push(`${nome}: manca la disponibilita di "${giorno}"`)
        return slot.map(() => false)
      }
      return slot.map((s) => oreGiorno[s] === true)
    })

    const materie = materieDi(dati)
    if (materie.length === 0) problemi.push(`${nome}: nessuna materia dichiarata`)

    return {
      id: slugDi(nome),
      nome,
      materie,
      disponibile,
      oreSettimanaliDisponibili: disponibile.flat().filter(Boolean).length,
    }
  })
}

function normalizzaAule(grezzo: Grezzo, problemi: string[]): Aula[] {
  if (!grezzo.aule || typeof grezzo.aule !== 'object') {
    problemi.push('`aule` mancante')
    return []
  }
  return Object.entries(grezzo.aule as Record<string, string>).map(([id, tipo]) => ({ id, tipo }))
}

function normalizzaMaterie(grezzo: Grezzo, problemi: string[]): Record<string, Materia> {
  const materie: Record<string, Materia> = {}
  for (const [id, dati] of Object.entries((grezzo.corsi ?? {}) as Record<string, Grezzo>)) {
    const oreTotali = dati.ore_totali ?? dati['ORE TOTALI']
    const tipoAula = dati.tipo_aula ?? dati['TIPO AULA']
    if (typeof oreTotali !== 'number') problemi.push(`Corso "${id}": ore totali mancanti`)
    if (typeof tipoAula !== 'string') problemi.push(`Corso "${id}": tipo aula mancante`)
    const laboratorio = tipoAula !== TIPO_AULA_ORDINARIA
    materie[id] = {
      id,
      oreTotali,
      tipoAula,
      bloccoOre: dati.blocco_ore ?? (laboratorio ? BLOCCO_ORE_LABORATORIO : BLOCCO_ORE_AULA),
      maxOreGiorno:
        dati.max_ore_giorno ?? (laboratorio ? MAX_ORE_GIORNO_LABORATORIO : MAX_ORE_GIORNO_AULA),
    }
  }
  if (Object.keys(materie).length === 0) problemi.push('`corsi` vuoto o mancante')
  return materie
}

function normalizzaClassi(grezzo: Grezzo, aule: Aula[], problemi: string[]): Record<string, Classe> {
  const ordinarie = aule.filter((a) => a.tipo === TIPO_AULA_ORDINARIA)
  const classi: Record<string, Classe> = {}
  let prossimaAula = 0

  for (const [id, dati] of Object.entries((grezzo.classi ?? {}) as Record<string, Grezzo>)) {
    if (!dati.data_inizio || !dati.data_fine) problemi.push(`Classe "${id}": date mancanti`)
    const aulaCasa = dati.aula_casa ?? ordinarie[prossimaAula++ % Math.max(ordinarie.length, 1)]?.id
    if (!aulaCasa) problemi.push(`Classe "${id}": nessuna aula ordinaria disponibile come aula casa`)
    classi[id] = {
      id,
      dataInizio: dati.data_inizio,
      dataFine: dati.data_fine,
      aulaCasa,
      oreGiornoMin: dati.ore_giorno_min ?? ORE_GIORNO_MIN_DEFAULT,
      oreGiornoMax: dati.ore_giorno_max ?? ORE_GIORNO_MAX_DEFAULT,
      materie: dati.materie ?? [],
    }
  }
  if (Object.keys(classi).length === 0) problemi.push('`classi` vuoto o mancante')
  return classi
}

/** JSON grezzo (formato esteso o formato dell'esempio originale) -> modello normalizzato. */
export function caricaModello(grezzo: Grezzo, chiusure: Chiusura[] = []): Modello {
  const problemi: string[] = []
  const slot = slotDi(grezzo)
  const pausaPranzo = grezzo.configurazione?.pausa_pranzo ?? PAUSA_PRANZO_DEFAULT

  const aule = normalizzaAule(grezzo, problemi)
  const modello: Modello = {
    slot,
    slotUtili: slot.map((_, i) => i).filter((i) => slot[i] !== pausaPranzo),
    pausaPranzo,
    docenti: normalizzaDocenti(grezzo, slot, problemi),
    aule,
    materie: normalizzaMaterie(grezzo, problemi),
    classi: normalizzaClassi(grezzo, aule, problemi),
    chiusure,
  }
  if (problemi.length > 0) throw new ErroreDati(problemi)
  return modello
}
