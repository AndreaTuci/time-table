/** Presentation helpers shared across the schedule views. No domain logic lives here. */

const SUBJECT_HUES = 8

/**
 * Every subject gets a stable hue from the categorical palette, assigned in declaration order.
 * Colour is the only saturated thing on screen, so it always means "which subject".
 */
export function subjectColours(subjects: string[]): Map<string, string> {
  return new Map(subjects.map((subject, i) => [subject, `var(--subject-${(i % SUBJECT_HUES) + 1})`]))
}

const WEEKDAY_LABELS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì']

export function weekdayLabel(index: number): string {
  return WEEKDAY_LABELS[index] ?? '—'
}

/** "2024-11-04" -> "04/11" */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

const MONTH_NAMES = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

export function monthName(iso: string): string {
  return MONTH_NAMES[Number(iso.split('-')[1]) - 1] ?? ''
}

/** Day number without a leading zero: "2024-09-16" -> "16". */
export function dayNumber(iso: string): string {
  return String(Number(iso.split('-')[2]))
}

/** "pino-palloncino" -> "Pino Palloncino". Ids arrive slugged from the data layer. */
export function personName(id: string): string {
  return id.replace(/-/g, ' ').replace(/(^|\s)(\p{Ll})/gu, (_, gap, letter) => gap + letter.toUpperCase())
}

/** "08.00-09.00" -> "08" — the terminal number reads better than the full range. */
export function hourLabel(slot: string): string {
  return slot.slice(0, 2)
}
