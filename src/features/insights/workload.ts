import type { Lesson, ScheduleResult } from '@/features/schedule/types'
import type { Modello } from '@/engine/types'

/** Figures derived from a generated schedule, shared by the teacher, room and class pages. */

export interface TeacherLoad {
  id: string
  nome: string
  materie: string[]
  /** Slots the teacher declared free, per week. */
  oreDisponibili: number
  /** Hours actually taught across the whole course. */
  oreAssegnate: number
  /** Hours in an average teaching week, so it can be compared with `oreDisponibili`. */
  oreSettimanali: number
  incarichi: { classe: string; materia: string }[]
}

export function teacherLoads(
  model: Modello,
  result: ScheduleResult,
  weeks: number
): TeacherLoad[] {
  const taught = new Map<string, number>()
  for (const lesson of result.lezioni) {
    taught.set(lesson.docente, (taught.get(lesson.docente) ?? 0) + 1)
  }
  return model.docenti.map((teacher) => {
    const oreAssegnate = taught.get(teacher.id) ?? 0
    return {
      id: teacher.id,
      nome: teacher.nome,
      materie: teacher.materie,
      oreDisponibili: teacher.oreSettimanaliDisponibili,
      oreAssegnate,
      oreSettimanali: weeks > 0 ? oreAssegnate / weeks : 0,
      incarichi: result.titolari
        .filter((assignment) => assignment.docente === teacher.id)
        .map(({ classe, materia }) => ({ classe, materia })),
    }
  })
}

/** What sits in a weekly slot, and how many weeks of the course it does so. */
export interface SlotUsage {
  materia: string
  classe: string
  settimane: number
}

/**
 * How a resource's week actually looks, counted across the whole course.
 *
 * A single week would be misleading: the timetable is stable but not identical week to week —
 * quotas rotate and closures remove days. Counting occurrences says "this slot is Matematica
 * with IDRA, twelve weeks out of fourteen", which is the true shape of the arrangement.
 */
export function weeklyUsage(lessons: Lesson[]): Map<string, SlotUsage> {
  const tally = new Map<string, Map<string, number>>()
  for (const lesson of lessons) {
    const cell = `${lesson.indiceGiorno}|${lesson.indiceSlot}`
    const what = `${lesson.materia}|${lesson.classe}`
    const perCell = tally.get(cell) ?? new Map<string, number>()
    perCell.set(what, (perCell.get(what) ?? 0) + 1)
    tally.set(cell, perCell)
  }

  const usage = new Map<string, SlotUsage>()
  for (const [cell, perCell] of tally) {
    const [what, settimane] = [...perCell].reduce((best, entry) => (entry[1] > best[1] ? entry : best))
    const [materia, classe] = what.split('|')
    usage.set(cell, { materia, classe, settimane })
  }
  return usage
}
