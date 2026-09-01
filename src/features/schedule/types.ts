/**
 * The view layer's names for what the engine returns.
 *
 * The engine and the data files still speak Italian: their vocabulary mirrors the Django models
 * this will eventually read from, so renaming it would only move the translation elsewhere.
 * This module is the seam where that vocabulary meets English code.
 */
export type { Lezione as Lesson, Modello as ScheduleModel } from '@/engine/types'
export type { EsitoOrario as ScheduleResult, OrePerClasse as SubjectCoverage } from '@/engine/solver'

/** A column on the board: either a teaching day or a closure standing in its place. */
export interface BoardDay {
  data: string
  indiceGiorno: number
  /** Reason the school is shut. Absent on a normal teaching day. */
  closedFor?: string
}
