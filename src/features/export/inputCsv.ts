import { GIORNI, type Modello } from '@/engine/types'
import type { Cella } from './csv'

/**
 * I dati DI INGRESSO, che sono il documento che conta.
 *
 * L'orario generato si giudica solo se si sa cosa e' entrato nel generatore: quali ore doveva
 * coprire, con quali docenti, con quali vincoli. Questi cinque file sono quella prova, e sono
 * anche cio' che un domani arrivera' dai modelli Django — le colonne portano gli stessi nomi.
 */

/** Una riga per docente e per giorno, con una colonna per fascia oraria. */
export function docentiRighe(modello: Modello): Cella[][] {
  const intestazione: Cella[] = ['docente', 'materie', 'giorno', ...modello.slot, 'ore utili nel giorno']
  const righe = modello.docenti.flatMap((docente) =>
    GIORNI.map((giorno, indice) => {
      const disponibile = docente.disponibile[indice]
      const utili = modello.slotUtili.filter((s) => disponibile[s]).length
      return [
        docente.nome,
        docente.materie.join(' + '),
        giorno,
        ...modello.slot.map((_, s) =>
          modello.slotUtili.includes(s) ? disponibile[s] : 'pausa'
        ),
        utili,
      ] as Cella[]
    })
  )
  return [intestazione, ...righe]
}

export function corsiRighe(modello: Modello): Cella[][] {
  const intestazione: Cella[] = [
    'materia',
    'ore totali',
    'tipo aula',
    'durata blocco',
    'max ore al giorno',
    'classi',
    'ore complessive',
    'docenti abilitati',
  ]
  const righe = Object.values(modello.materie).map((materia) => {
    const classi = Object.values(modello.classi)
      .filter((classe) => classe.materie.includes(materia.id))
      .map((classe) => classe.id)
    return [
      materia.id,
      materia.oreTotali,
      materia.tipoAula,
      materia.bloccoOre,
      materia.maxOreGiorno,
      classi.join(' '),
      materia.oreTotali * classi.length,
      modello.docenti
        .filter((d) => d.materie.includes(materia.id))
        .map((d) => d.nome)
        .join(' · '),
    ] as Cella[]
  })
  return [intestazione, ...righe]
}

export function classiRighe(modello: Modello): Cella[][] {
  const intestazione: Cella[] = [
    'classe',
    'data inizio',
    'data fine',
    'aula casa',
    'ore giorno min',
    'ore giorno max',
    'materie',
    'ore totali',
  ]
  const righe = Object.values(modello.classi).map((classe) => [
    classe.id,
    classe.dataInizio,
    classe.dataFine,
    classe.aulaCasa,
    classe.oreGiornoMin,
    classe.oreGiornoMax,
    classe.materie.join(' · '),
    classe.materie.reduce((ore, m) => ore + (modello.materie[m]?.oreTotali ?? 0), 0),
  ] as Cella[])
  return [intestazione, ...righe]
}

export function auleRighe(modello: Modello): Cella[][] {
  return [
    ['aula', 'tipo'],
    ...modello.aule.map((aula) => [aula.id, aula.tipo] as Cella[]),
  ]
}

export function chiusureRighe(modello: Modello): Cella[][] {
  return [
    ['dal', 'al', 'motivo'],
    ...modello.chiusure.map((c) => [c.dal, c.al, c.motivo] as Cella[]),
  ]
}
