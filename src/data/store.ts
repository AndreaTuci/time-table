import { computed, reactive, ref, watch } from 'vue'
import { caricaModello, ErroreDati, slugDi } from '@/engine/loader'
import { GIORNI, type Chiusura, type Modello } from '@/engine/types'
import defaultDataset from '../../data/dataset-demo.json'
import defaultClosures from '../../data/chiusure.json'

/**
 * The editable input data, kept in the browser.
 *
 * The raw JSON stays the source of truth rather than some normalised in-memory model, for two
 * reasons: it is what the worker has to be handed, and it is the shape that will one day come
 * out of Django. Every view still reads the NORMALISED model derived from it, so the interface
 * and the solver never disagree about defaults.
 */

const STORAGE_KEY = 'quadro-orario/dataset/v1'

type Dataset = Record<string, any>

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readStored(): Dataset | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Dataset) : null
  } catch {
    // Unreadable storage is not a data error: fall back to the example and say so in the UI.
    storageAvailable.value = false
    return null
  }
}

export const storageAvailable = ref(true)

const dataset = reactive<Dataset>(readStored() ?? clone(defaultDataset))
const closures = clone(defaultClosures) as Chiusura[]

/** Bumped on every edit, so a stale schedule can be told apart from a current one. */
export const revision = ref(0)

watch(
  dataset,
  () => {
    revision.value++
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset))
    } catch {
      storageAvailable.value = false
    }
  },
  { deep: true }
)

export interface ModelState {
  model: Modello | null
  problems: string[]
}

/**
 * The normalised model, rebuilt whenever the data changes.
 * Invalid edits surface as problems rather than throwing: the user has to be able to see what
 * they broke and fix it, not lose the page.
 */
export const modelState = computed<ModelState>(() => {
  try {
    return { model: caricaModello(clone(dataset), closures), problems: [] }
  } catch (error) {
    if (error instanceof ErroreDati) return { model: null, problems: error.problemi }
    return { model: null, problems: [error instanceof Error ? error.message : String(error)] }
  }
})

/** A plain copy for the worker: a reactive proxy is not worth sending across a thread boundary. */
export function datasetForWorker(): { data: Dataset; closures: Chiusura[] } {
  return { data: clone(dataset), closures: clone(closures) }
}

export function resetToExample(): void {
  for (const key of Object.keys(dataset)) delete dataset[key]
  Object.assign(dataset, clone(defaultDataset))
}

/** True once the data differs from the shipped example. Drives the "restore" affordance. */
export const edited = computed(() => JSON.stringify(dataset) !== JSON.stringify(defaultDataset))

// ---- Edits -----------------------------------------------------------------------------------

function teacherEntry(teacherId: string): Record<string, any> | null {
  for (const entry of dataset.insegnanti ?? []) {
    const [name] = Object.keys(entry)
    if (slugDi(name) === teacherId) return entry[name]
  }
  return null
}

/** Hours a teacher is free, excluding the lunch slot — the same count the loader reports. */
function usableHours(availability: Record<string, Record<string, boolean>>): number {
  const lunch = dataset.configurazione?.pausa_pranzo
  return GIORNI.reduce((total, day) => {
    const hours = availability[day] ?? {}
    return total + Object.entries(hours).filter(([slot, free]) => free && slot !== lunch).length
  }, 0)
}

export function toggleAvailability(teacherId: string, dayIndex: number, slotLabel: string): void {
  const teacher = teacherEntry(teacherId)
  const day = GIORNI[dayIndex]
  if (!teacher?.disponibilita?.[day]) return
  teacher.disponibilita[day][slotLabel] = !teacher.disponibilita[day][slotLabel]
  // The denormalised count travels with the data into the CSV export, so it must not go stale.
  teacher.ore_settimanali_disponibili = usableHours(teacher.disponibilita)
}

export function setClassWindow(classId: string, from: string, to: string): void {
  const classe = dataset.classi?.[classId]
  if (!classe) return
  classe.data_inizio = from
  classe.data_fine = to
}

export type SubjectNumber = 'ore_totali' | 'blocco_ore' | 'max_ore_giorno'

export function setSubjectNumber(subjectId: string, field: SubjectNumber, value: number): void {
  const subject = dataset.corsi?.[subjectId]
  if (!subject || !Number.isFinite(value)) return
  subject[field] = Math.max(1, Math.round(value))
}
