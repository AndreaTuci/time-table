import type { Modello } from '@/engine/types'
import { weekdayLabel } from '@/lib/subjects'
import type { ScheduleResult } from '@/features/schedule/types'
import type { Cella } from './csv'

/** L'orario generato, in due forme: una per verificarlo a macchina, una per appenderlo in bacheca. */

/** Una riga per ora di lezione: la forma con cui si controlla l'orario con un filtro di Excel. */
export function orarioRighe(modello: Modello, esito: ScheduleResult): Cella[][] {
  const intestazione: Cella[] = [
    'data',
    'giorno',
    'ora',
    'classe',
    'materia',
    'docente',
    'aula',
  ]
  const nomeDocente = new Map(modello.docenti.map((d) => [d.id, d.nome]))
  const righe = esito.lezioni.map((lezione) => [
    lezione.data,
    weekdayLabel(lezione.indiceGiorno),
    modello.slot[lezione.indiceSlot],
    lezione.classe,
    lezione.materia,
    nomeDocente.get(lezione.docente) ?? lezione.docente,
    lezione.aula,
  ] as Cella[])
  return [intestazione, ...righe]
}

/**
 * Una riga per giorno e una colonna per ora: e' la griglia che una segreteria appende in bacheca.
 * La colonna della pausa resta, vuota: in un orario stampato l'interruzione si deve vedere.
 */
export function orarioClasseRighe(
  modello: Modello,
  esito: ScheduleResult,
  classeId: string
): Cella[][] {
  const intestazione: Cella[] = ['data', 'giorno', ...modello.slot]
  const lezioni = esito.lezioni.filter((lezione) => lezione.classe === classeId)
  const date = [...new Set(lezioni.map((lezione) => lezione.data))].sort()

  const righe = date.map((data) => {
    const delGiorno = lezioni.filter((lezione) => lezione.data === data)
    const celle = modello.slot.map((_, indice) => {
      const lezione = delGiorno.find((l) => l.indiceSlot === indice)
      return lezione ? lezione.materia : ''
    })
    return [data, weekdayLabel(delGiorno[0].indiceGiorno), ...celle] as Cella[]
  })
  return [intestazione, ...righe]
}
