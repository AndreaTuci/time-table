import { caricaModello, ErroreDati } from '@/engine/loader'
import type { Chiusura, Modello } from '@/engine/types'
import dataset from '../../data/dataset-demo.json'
import closures from '../../data/chiusure.json'

/**
 * The single source of input data for the whole app.
 *
 * The views read the NORMALISED model — the very object the solver is handed — rather than the
 * raw JSON. One vocabulary, one set of defaults, and no chance of a page describing the data
 * differently from the engine that consumed it.
 *
 * The raw JSON is kept alongside because the worker re-parses it on its own thread, where a
 * normalised model could not be structured-cloned as cheaply.
 */
export const rawDataset = dataset as unknown as Record<string, unknown>
export const rawClosures = closures as Chiusura[]

function load(): { model: Modello | null; problems: string[] } {
  try {
    return { model: caricaModello(rawDataset, rawClosures), problems: [] }
  } catch (error) {
    if (error instanceof ErroreDati) return { model: null, problems: error.problemi }
    return { model: null, problems: [error instanceof Error ? error.message : String(error)] }
  }
}

const loaded = load()

export const model = loaded.model
export const modelProblems = loaded.problems
