/**
 * Shared geometry for the board. The rail and every class column read these values, which is
 * what keeps the numbered terminals aligned with the lessons beside them.
 *
 * The lunch break is not a row. It is a gap in the grid, so the DIN rail can physically stop
 * there — the break is an interruption of the bar, not a greyed-out cell.
 */

export const ROW_HEIGHT_REM = 2.5
export const BREAK_HEIGHT_REM = 0.85
export const DAY_HEADER_REM = 1.75
export const CLASS_HEADER_REM = 1.5

export interface RailLayout {
  /** Usable slot indices, in order. Excludes the lunch slot. */
  usable: number[]
  /** How many usable slots come before the break. */
  morningCount: number
}

export function railLayout(slots: string[], usable: number[], lunchSlot: string): RailLayout {
  const lunchIndex = slots.indexOf(lunchSlot)
  return {
    usable,
    morningCount: lunchIndex < 0 ? usable.length : usable.filter((i) => i < lunchIndex).length,
  }
}

/** CSS `grid-template-rows` with the break inserted as a real gap between the two runs. */
export function rowTemplate(layout: RailLayout): string {
  const { morningCount, usable } = layout
  const afternoon = usable.length - morningCount
  const morning = `repeat(${morningCount}, ${ROW_HEIGHT_REM}rem)`
  if (afternoon <= 0) return morning
  return `${morning} ${BREAK_HEIGHT_REM}rem repeat(${afternoon}, ${ROW_HEIGHT_REM}rem)`
}

/** Grid line a usable slot position starts on. Positions after the break skip the gap row. */
export function rowStart(layout: RailLayout, position: number): number {
  return position < layout.morningCount ? position + 1 : position + 2
}

/**
 * `grid-row` for a lesson block. A block that runs across lunch spans the gap too, which is
 * exactly right: the lesson does continue after the break.
 */
export function blockRow(layout: RailLayout, position: number, length: number): string {
  const start = rowStart(layout, position)
  const end = rowStart(layout, position + length - 1) + 1
  return `${start} / ${end}`
}

export const BOARD_HEADER_REM = DAY_HEADER_REM + CLASS_HEADER_REM
