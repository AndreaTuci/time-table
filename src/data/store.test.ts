import { beforeEach, describe, expect, it } from 'vitest'
import {
  datasetForWorker,
  edited,
  modelState,
  resetToExample,
  setClassWindow,
  setSubjectNumber,
  toggleAvailability,
} from './store'

/**
 * The store is where a click becomes a change to the data the solver will read, so the parts
 * worth pinning are the ones that could silently disagree with the engine: the slug lookup that
 * finds a teacher, and the availability count that has to exclude the lunch slot exactly as the
 * loader does.
 */
describe('store', () => {
  beforeEach(() => resetToExample())

  it('parte dai dati di esempio, che sono validi', () => {
    expect(edited.value).toBe(false)
    expect(modelState.value.problems).toEqual([])
    expect(modelState.value.model).not.toBeNull()
  })

  it('spegne e riaccende uno slot ritrovando il docente dal suo identificativo', () => {
    const before = modelState.value.model!.docenti.find((d) => d.id === 'pino-palloncino')!
    const slot = before.disponibile[0].findIndex(Boolean)
    expect(slot).toBeGreaterThanOrEqual(0)

    const label = modelState.value.model!.slot[slot]
    toggleAvailability('pino-palloncino', 0, label)

    const after = modelState.value.model!.docenti.find((d) => d.id === 'pino-palloncino')!
    expect(after.disponibile[0][slot]).toBe(false)
    expect(after.oreSettimanaliDisponibili).toBe(before.oreSettimanaliDisponibili - 1)
    expect(edited.value).toBe(true)

    toggleAvailability('pino-palloncino', 0, label)
    expect(edited.value).toBe(false)
  })

  it('tiene il conteggio salvato nei dati allineato a quello che calcola il motore', () => {
    const model = modelState.value.model!
    const teacher = model.docenti.find((d) => d.id === 'carla-capecchi')!
    toggleAvailability('carla-capecchi', 1, model.slot[model.slotUtili[0]])

    const raw = datasetForWorker().data as Record<string, any>
    const entry = raw.insegnanti.find((e: Record<string, unknown>) => 'carla capecchi' in e)
    const recomputed = modelState.value.model!.docenti.find((d) => d.id === 'carla-capecchi')!
    expect(entry['carla capecchi'].ore_settimanali_disponibili).toBe(
      recomputed.oreSettimanaliDisponibili
    )
    expect(recomputed.oreSettimanaliDisponibili).not.toBe(teacher.oreSettimanaliDisponibili)
  })

  it('ignora un slot inesistente invece di corrompere i dati', () => {
    toggleAvailability('pino-palloncino', 0, '03.00-04.00')
    expect(modelState.value.problems).toEqual([])
  })

  it('modifica le ore di un corso e la finestra di una classe', () => {
    setSubjectNumber('MATEMATICA', 'ore_totali', 90)
    setClassWindow('IDRA', '2024-09-23', '2024-12-13')
    const model = modelState.value.model!
    expect(model.materie.MATEMATICA.oreTotali).toBe(90)
    expect(model.classi.IDRA.dataInizio).toBe('2024-09-23')
    expect(model.classi.IDRA.dataFine).toBe('2024-12-13')
  })

  it('rifiuta valori non numerici e non scende sotto un ora', () => {
    setSubjectNumber('MATEMATICA', 'blocco_ore', Number.NaN)
    expect(modelState.value.model!.materie.MATEMATICA.bloccoOre).toBe(2)
    setSubjectNumber('MATEMATICA', 'blocco_ore', -5)
    expect(modelState.value.model!.materie.MATEMATICA.bloccoOre).toBe(1)
  })
})
