import { calendarioDi, type Calendario } from './calendario'
import type { Modello } from './types'

/**
 * Controlli di fattibilita' eseguiti PRIMA della ricerca.
 *
 * Ogni controllo qui dentro e' una CONDIZIONE NECESSARIA: se scatta, l'orario non esiste, e la
 * dimostrazione sta nel commento sopra la funzione. La regola non e' pignoleria — dichiarare
 * impossibile un orario che il motore avrebbe risolto e' molto peggio che tacere, perche' toglie
 * a chi guarda l'unico motivo per fidarsi di quel che legge.
 *
 * Dove un limite piu' stretto sarebbe stato solo probabile, si e' preferito quello piu' largo e
 * certo: alcune istanze impossibili passeranno di qui senza essere riconosciute, e verranno
 * scoperte dalla ricerca. E' il verso giusto in cui sbagliare.
 */

export type Gravita = 'bloccante' | 'avvertimento'

export interface Problema {
  gravita: Gravita
  /** Chi ne e' responsabile: serve a escludere dalla generazione solo la classe colpita. */
  classe?: string
  titolo: string
  /** Frase leggibile da chi gestisce la scuola. Sempre con dei numeri dentro. */
  messaggio: string
  /** Cosa cambiare e di quanto. Sempre una via d'uscita concreta. */
  rimedio: string
}

/** Ore di lezione che una classe puo' davvero fare in un giorno, viste le regole sui blocchi. */
export function oreGiornaliereRealizzabili(modello: Modello, classeId: string): number[] {
  const classe = modello.classi[classeId]
  const pausa = modello.slot.indexOf(modello.pausaPranzo)
  const mattina = modello.slotUtili.filter((s) => s < pausa).length
  const pomeriggio = modello.slotUtili.length - mattina
  const durate = [...new Set(classe.materie.map((m) => modello.materie[m]?.bloccoOre).filter(Boolean))]

  const totali = new Set<number>()
  for (const m of lunghezzeComponibili(mattina, durate)) {
    for (const p of lunghezzeComponibili(pomeriggio, durate)) {
      const totale = m + p
      if (totale >= classe.oreGiornoMin && totale <= classe.oreGiornoMax) totali.add(totale)
    }
  }
  return [...totali].sort((a, b) => a - b)
}

/** Lunghezze fino a `massimo` esprimibili come somma dei blocchi disponibili, zero compreso. */
function lunghezzeComponibili(massimo: number, durate: number[]): number[] {
  const possibile = new Array<boolean>(massimo + 1).fill(false)
  possibile[0] = true
  for (let n = 1; n <= massimo; n++) possibile[n] = durate.some((d) => d <= n && possibile[n - d])
  return possibile.map((ok, n) => (ok ? n : -1)).filter((n) => n >= 0)
}

/** La piu' lunga sequenza di ore libere consecutive di un docente, senza scavalcare la pausa. */
function fasciaPiuLunga(modello: Modello, docenteId: string): number {
  const docente = modello.docenti.find((d) => d.id === docenteId)
  if (!docente) return 0
  let massima = 0
  for (const giorno of docente.disponibile) {
    let corrente = 0
    let precedente = -2
    for (const slot of modello.slotUtili) {
      // Gli slot utili saltano la pausa, quindi due ore a cavallo di essa non sono mai
      // consecutive qui: la contiguita' oraria basta a escludere lo scavalcamento.
      corrente = giorno[slot] ? (slot === precedente + 1 ? corrente + 1 : 1) : 0
      precedente = slot
      massima = Math.max(massima, corrente)
    }
  }
  return massima
}

function oreTotaliDi(modello: Modello, classeId: string): number {
  return modello.classi[classeId].materie.reduce(
    (totale, materia) => totale + (modello.materie[materia]?.oreTotali ?? 0),
    0
  )
}

/**
 * Capienza della classe. Ogni giorno utile ospita al massimo la piu' lunga giornata realizzabile,
 * quindi se le ore totali la superano moltiplicata per i giorni disponibili nessuna disposizione
 * puo' esistere. E' il controllo che coglie la finestra troppo stretta.
 */
function capienzaClasse(modello: Modello, classeId: string, calendario: Calendario): Problema[] {
  const classe = modello.classi[classeId]
  const giorni = calendario.giorni.filter(
    (g) => g.data >= classe.dataInizio && g.data <= classe.dataFine
  )
  const ore = oreTotaliDi(modello, classeId)
  const realizzabili = oreGiornaliereRealizzabili(modello, classeId)

  if (giorni.length === 0) {
    return [
      {
        gravita: 'bloccante',
        classe: classeId,
        titolo: 'Nessun giorno utile',
        messaggio: `${classeId} non ha nemmeno un giorno di lezione fra il ${classe.dataInizio} e il ${classe.dataFine}.`,
        rimedio: 'Allarga la finestra della classe: cosi’ com’è contiene solo weekend o chiusure.',
      },
    ]
  }

  if (realizzabili.length === 0) {
    return [
      {
        gravita: 'bloccante',
        classe: classeId,
        titolo: 'Nessuna giornata valida',
        messaggio: `Per ${classeId} non esiste una giornata fra ${classe.oreGiornoMin} e ${classe.oreGiornoMax} ore componibile con i blocchi delle sue materie, dato che una lezione non può scavalcare la pausa pranzo.`,
        rimedio: `Allarga l’intervallo di ore giornaliere, oppure cambia la durata dei blocchi delle materie.`,
      },
    ]
  }

  const massimo = realizzabili[realizzabili.length - 1]
  const capienza = giorni.length * massimo
  if (ore <= capienza) return []

  const giorniNecessari = Math.ceil(ore / massimo)
  const dataSufficiente = calendario.giorni.filter((g) => g.data >= classe.dataInizio)[
    giorniNecessari - 1
  ]?.data

  return [
    {
      gravita: 'bloccante',
      classe: classeId,
      titolo: 'Ore oltre la capienza del periodo',
      messaggio: `${classeId}: ${ore} ore da collocare in ${giorni.length} giorni utili, ma una giornata non può superare le ${massimo} ore. Il periodo ne regge al massimo ${capienza}.`,
      rimedio: dataSufficiente
        ? `Servono almeno ${giorniNecessari} giorni utili: sposta la fine al ${dataSufficiente}, oppure togli ${ore - capienza} ore.`
        : `Nemmeno l’intero calendario basta: togli almeno ${ore - capienza} ore alle materie di ${classeId}.`,
    },
  ]
}

/** Una materia senza docenti, o i cui docenti non hanno mai una finestra lunga quanto il blocco. */
function copertureMancanti(modello: Modello, classeId: string): Problema[] {
  const problemi: Problema[] = []
  for (const materiaId of modello.classi[classeId].materie) {
    const materia = modello.materie[materiaId]
    if (!materia) continue
    const abilitati = modello.docenti.filter((d) => d.materie.includes(materiaId))

    if (abilitati.length === 0) {
      problemi.push({
        gravita: 'bloccante',
        classe: classeId,
        titolo: 'Materia senza docenti',
        messaggio: `Nessun docente insegna ${materiaId}, che serve alla classe ${classeId}.`,
        rimedio: `Assegna ${materiaId} a un docente, oppure togli la materia dal piano di ${classeId}.`,
      })
      continue
    }

    const fasciaMigliore = Math.max(...abilitati.map((d) => fasciaPiuLunga(modello, d.id)))
    if (fasciaMigliore < materia.bloccoOre) {
      problemi.push({
        gravita: 'bloccante',
        classe: classeId,
        titolo: 'Nessuna finestra abbastanza lunga',
        messaggio: `${materiaId} si fa in blocchi da ${materia.bloccoOre} ore consecutive, ma il docente più disponibile arriva a ${fasciaMigliore} ore di fila senza interruzioni.`,
        rimedio: `Aggiungi disponibilità contigue a un docente di ${materiaId}, oppure riduci il blocco a ${fasciaMigliore} ore.`,
      })
    }
  }
  return problemi
}

/** Una materia che chiede un tipo di aula inesistente non ha dove svolgersi. */
function auleMancanti(modello: Modello, classeId: string): Problema[] {
  const tipi = new Set(modello.aule.map((a) => a.tipo))
  return modello.classi[classeId].materie
    .map((id) => modello.materie[id])
    .filter((materia) => materia && !tipi.has(materia.tipoAula))
    .map((materia) => ({
      gravita: 'bloccante' as const,
      classe: classeId,
      titolo: 'Tipo di aula inesistente',
      messaggio: `${materia.id} richiede un’aula di tipo ${materia.tipoAula}, che non esiste.`,
      rimedio: `Aggiungi un’aula di tipo ${materia.tipoAula}, oppure cambia il tipo richiesto dalla materia.`,
    }))
}

/**
 * Tutti i controlli, per ogni classe. L'esito e' pensato per essere filtrato per classe: una
 * classe impossibile viene esclusa dalla generazione, le altre restano pianificabili.
 */
export function diagnostica(modello: Modello): Problema[] {
  const finestre = Object.values(modello.classi)
  const inizio = finestre.reduce((m, c) => (c.dataInizio < m ? c.dataInizio : m), finestre[0].dataInizio)
  const fine = finestre.reduce((m, c) => (c.dataFine > m ? c.dataFine : m), finestre[0].dataFine)
  const calendario = calendarioDi(inizio, fine, modello.chiusure)

  return Object.keys(modello.classi).flatMap((classeId) => [
    ...capienzaClasse(modello, classeId, calendario),
    ...copertureMancanti(modello, classeId),
    ...auleMancanti(modello, classeId),
  ])
}

/** Le classi che non possono essere pianificate: la generazione le salta invece di fallire tutta. */
export function classiBloccate(problemi: Problema[]): Set<string> {
  return new Set(
    problemi.filter((p) => p.gravita === 'bloccante' && p.classe).map((p) => p.classe as string)
  )
}
