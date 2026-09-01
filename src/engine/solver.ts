import { calendarioDi, type Calendario, type GiornoUtile } from './calendario'
import { contestoDa, chiave, type Residuo } from './giornata'
import { quotePerClasse, type QuoteMateria } from './quote'
import { risolviSettimana, type Abitudini } from './settimana'
import { assegnaTitolari, type Titolare } from './titolari'
import type { Lezione, Modello } from './types'

/** Terzo strato: percorre il calendario, risolve una settimana per volta, data le lezioni. */

export interface OrePerClasse {
  classe: string
  materia: string
  oreProgrammate: number
  oreRichieste: number
}

export interface EsitoOrario {
  lezioni: Lezione[]
  titolari: Titolare[]
  calendario: Calendario
  copertura: OrePerClasse[]
  settimaneNonRisolte: number[]
  problemi: string[]
  /** Quanto e' durata la generazione: la demo lo mostra, il motore non lo usa. */
  millisecondi: number
}

interface PianoClasse {
  giorni: GiornoUtile[]
  settimaneAttive: number[]
  quote: QuoteMateria[]
}

function pianoDi(modello: Modello, classeId: string, globale: Calendario): PianoClasse {
  const classe = modello.classi[classeId]
  const giorni = globale.giorni.filter(
    (g) => g.data >= classe.dataInizio && g.data <= classe.dataFine
  )
  const settimaneAttive = [...new Set(giorni.map((g) => g.settimana))].sort((a, b) => a - b)
  const giorniPerSettimana = settimaneAttive.map(
    (w) => giorni.filter((g) => g.settimana === w).length
  )
  const materie = classe.materie.map((m) => modello.materie[m]).filter(Boolean)
  return { giorni, settimaneAttive, quote: quotePerClasse(materie, giorniPerSettimana) }
}

/** Le lezioni che una classe deve collocare in una certa settimana globale, per materia. */
function fabbisognoDellaSettimana(piano: PianoClasse, settimana: number): Residuo {
  const residuo: Residuo = new Map()
  const posizione = piano.settimaneAttive.indexOf(settimana)
  if (posizione < 0) return residuo
  for (const quota of piano.quote) {
    const gia = quota.blocchiPerSettimana.slice(0, posizione).reduce((a, b) => a + b, 0)
    const quante = quota.blocchiPerSettimana[posizione]
    if (quante > 0) residuo.set(quota.materia, quota.durate.slice(gia, gia + quante))
  }
  return residuo
}

function finestraGlobale(modello: Modello): [string, string] {
  const classi = Object.values(modello.classi)
  return [
    classi.reduce((min, c) => (c.dataInizio < min ? c.dataInizio : min), classi[0].dataInizio),
    classi.reduce((max, c) => (c.dataFine > max ? c.dataFine : max), classi[0].dataFine),
  ]
}

function coperturaDi(modello: Modello, lezioni: Lezione[]): OrePerClasse[] {
  const programmate = new Map<string, number>()
  for (const lezione of lezioni) {
    const k = chiave(lezione.classe, lezione.materia)
    programmate.set(k, (programmate.get(k) ?? 0) + 1)
  }
  return Object.values(modello.classi).flatMap((classe) =>
    classe.materie.map((materia) => ({
      classe: classe.id,
      materia,
      oreProgrammate: programmate.get(chiave(classe.id, materia)) ?? 0,
      oreRichieste: modello.materie[materia]?.oreTotali ?? 0,
    }))
  )
}

export function generaOrario(modello: Modello): EsitoOrario {
  const avvio = Date.now()
  const [inizio, fine] = finestraGlobale(modello)
  const globale = calendarioDi(inizio, fine, modello.chiusure)

  const piani = new Map<string, PianoClasse>()
  const settimanePerClasse: Record<string, number> = {}
  for (const classeId of Object.keys(modello.classi)) {
    const piano = pianoDi(modello, classeId, globale)
    piani.set(classeId, piano)
    settimanePerClasse[classeId] = piano.settimaneAttive.length
  }

  const { titolari, problemi } = assegnaTitolari(modello, settimanePerClasse)
  const ctx = contestoDa(modello, titolari)

  const lezioni: Lezione[] = []
  const settimaneNonRisolte: number[] = []
  let abitudini: Abitudini = new Map()

  for (let settimana = 0; settimana < globale.numeroSettimane; settimana++) {
    const fabbisogno = new Map<string, Residuo>()
    const giorniPerClasse = new Map<string, number[]>()
    for (const [classeId, piano] of piani) {
      const dellaSettimana = piano.giorni.filter((g) => g.settimana === settimana)
      if (dellaSettimana.length === 0) continue
      giorniPerClasse.set(classeId, [...new Set(dellaSettimana.map((g) => g.indiceGiorno))].sort())
      fabbisogno.set(classeId, fabbisognoDellaSettimana(piano, settimana))
    }
    if (fabbisogno.size === 0) continue

    const esito = risolviSettimana(modello, ctx, fabbisogno, giorniPerClasse, abitudini)
    if (!esito) {
      settimaneNonRisolte.push(settimana)
      continue
    }

    abitudini = new Map()
    for (const [indiceGiorno, collocati] of esito.perGiorno) {
      const perClasse = new Map<string, Map<number, string>>()
      for (const blocco of collocati) {
        const posizione = modello.slotUtili.indexOf(blocco.slotInizio)
        const dellaClasse = perClasse.get(blocco.classe) ?? new Map<number, string>()
        dellaClasse.set(posizione, blocco.materia)
        perClasse.set(blocco.classe, dellaClasse)
        const giorno = piani
          .get(blocco.classe)!
          .giorni.find((g) => g.settimana === settimana && g.indiceGiorno === indiceGiorno)
        if (!giorno) continue
        for (const slot of blocco.slot) {
          lezioni.push({
            data: giorno.data,
            indiceGiorno: giorno.indiceGiorno,
            indiceSlot: slot,
            classe: blocco.classe,
            materia: blocco.materia,
            docente: blocco.docente,
            aula: blocco.aula,
            fuoriTemplate: false,
          })
        }
      }
      abitudini.set(indiceGiorno, perClasse)
    }
  }

  lezioni.sort((a, b) => a.data.localeCompare(b.data) || a.indiceSlot - b.indiceSlot || a.classe.localeCompare(b.classe))
  return {
    lezioni,
    titolari,
    calendario: globale,
    copertura: coperturaDi(modello, lezioni),
    settimaneNonRisolte,
    problemi,
    millisecondi: Date.now() - avvio,
  }
}
