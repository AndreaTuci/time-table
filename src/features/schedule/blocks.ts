import type { Lesson } from './types'

/**
 * Consecutive hours of the same subject are one lesson, not several.
 * "Matematica dalle 8 alle 10" is how a timetable is read, so it is how it is drawn.
 */
export interface LessonBlock {
  lesson: Lesson
  /** Position of the first hour among the usable slots. */
  position: number
  length: number
}

export function groupIntoBlocks(lessons: Lesson[], usable: number[]): LessonBlock[] {
  const positionOf = new Map(usable.map((slot, position) => [slot, position]))
  const ordered = [...lessons].sort((a, b) => a.indiceSlot - b.indiceSlot)

  const blocks: LessonBlock[] = []
  for (const lesson of ordered) {
    const position = positionOf.get(lesson.indiceSlot)
    if (position === undefined) continue
    const previous = blocks[blocks.length - 1]
    // Same subject is not enough: two adjacent hours only merge if they are genuinely the same
    // lesson, same teacher and same room. Today one teacher owns a class-subject for the whole
    // course so this cannot differ, but the drawing must not depend on that staying true.
    const continues =
      previous &&
      previous.lesson.materia === lesson.materia &&
      previous.lesson.docente === lesson.docente &&
      previous.lesson.aula === lesson.aula &&
      previous.position + previous.length === position
    if (continues) previous.length++
    else blocks.push({ lesson, position, length: 1 })
  }
  return blocks
}
