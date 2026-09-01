import type { Chiusura, IndiceGiorno } from './types'
import { aIso, daIso, festivitaItaliane, sommaGiorni } from './festivita'

const SABATO = 6
const DOMENICA = 0
const GIORNI_LAVORATIVI_PER_SETTIMANA = 5

export interface GiornoUtile {
  data: string
  indiceGiorno: IndiceGiorno
  /** Settimana 0-based dall'inizio del corso. Serve alla proiezione dell'orario tipo. */
  settimana: number
}

export interface GiornoEscluso {
  data: string
  motivo: string
  /** Dove cade nella griglia settimanale: senza questo l'interfaccia non puo' disegnarlo. */
  indiceGiorno: IndiceGiorno
  settimana: number
}

export interface Calendario {
  giorni: GiornoUtile[]
  esclusi: GiornoEscluso[]
  numeroSettimane: number
}

function indiceGiornoDi(data: Date): IndiceGiorno | null {
  const giornoSettimana = data.getUTCDay()
  if (giornoSettimana === SABATO || giornoSettimana === DOMENICA) return null
  return (giornoSettimana - 1) as IndiceGiorno
}

/** Espande gli intervalli di chiusura in una mappa data -> motivo. */
function espandiChiusure(chiusure: Chiusura[]): Map<string, string> {
  const chiuso = new Map<string, string>()
  for (const chiusura of chiusure) {
    const fine = daIso(chiusura.al)
    if (fine < daIso(chiusura.dal)) {
      throw new Error(`Chiusura "${chiusura.motivo}": ${chiusura.al} precede ${chiusura.dal}`)
    }
    for (let d = daIso(chiusura.dal); d <= fine; d = sommaGiorni(d, 1)) {
      chiuso.set(aIso(d), chiusura.motivo)
    }
  }
  return chiuso
}

/**
 * Giorni in cui una classe puo' fare lezione fra due date, con il motivo di ogni esclusione.
 * I giorni utili sono numerati per settimana: e' la chiave con cui l'orario tipo si proietta.
 */
export function calendarioDi(
  dataInizio: string,
  dataFine: string,
  chiusure: Chiusura[]
): Calendario {
  const inizio = daIso(dataInizio)
  const fine = daIso(dataFine)
  if (fine < inizio) throw new Error(`data_fine ${dataFine} precede data_inizio ${dataInizio}`)

  const chiuso = espandiChiusure(chiusure)
  const festive = new Map<string, string>()
  for (let anno = inizio.getUTCFullYear(); anno <= fine.getUTCFullYear(); anno++) {
    for (const [data, nome] of festivitaItaliane(anno)) festive.set(data, nome)
  }

  const giorni: GiornoUtile[] = []
  const esclusi: GiornoEscluso[] = []
  let settimana = 0
  let ultimoIndice = -1

  for (let d = inizio; d <= fine; d = sommaGiorni(d, 1)) {
    const data = aIso(d)
    const indiceGiorno = indiceGiornoDi(d)
    if (indiceGiorno === null) continue

    if (indiceGiorno <= ultimoIndice) settimana++
    ultimoIndice = indiceGiorno

    const motivo = festive.get(data) ?? chiuso.get(data)
    if (motivo) esclusi.push({ data, motivo, indiceGiorno, settimana })
    else giorni.push({ data, indiceGiorno, settimana })
  }

  return { giorni, esclusi, numeroSettimane: settimana + 1 }
}

/** Quante volte cade un certo giorno della settimana: utile a diagnosticare gli sbilanciamenti. */
export function occorrenzePerGiorno(calendario: Calendario): number[] {
  const conteggio = new Array(GIORNI_LAVORATIVI_PER_SETTIMANA).fill(0)
  for (const giorno of calendario.giorni) conteggio[giorno.indiceGiorno]++
  return conteggio
}

/**
 * Giorni utili di ciascuna settimana. E' la base su cui si spartiscono le quote: la settimana
 * che perde un giorno per una festivita' deve ricevere meno ore, non le stesse ore compresse.
 */
export function giorniPerSettimana(calendario: Calendario): number[] {
  const conteggio = new Array(calendario.numeroSettimane).fill(0)
  for (const giorno of calendario.giorni) conteggio[giorno.settimana]++
  return conteggio
}
