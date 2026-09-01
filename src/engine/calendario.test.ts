import { describe, expect, it } from 'vitest'
import { calendarioDi, occorrenzePerGiorno } from './calendario'
import { aIso, domenicaDiPasqua } from './festivita'

const CHIUSURE = [{ dal: '2024-12-23', al: '2025-01-06', motivo: 'Vacanze natalizie' }]

describe('festivita', () => {
  it('calcola la Pasqua di anni noti', () => {
    expect(aIso(domenicaDiPasqua(2024))).toBe('2024-03-31')
    expect(aIso(domenicaDiPasqua(2025))).toBe('2025-04-20')
    expect(aIso(domenicaDiPasqua(2038))).toBe('2038-04-25')
  })
})

describe('calendarioDi', () => {
  const calendario = calendarioDi('2024-09-16', '2024-12-20', CHIUSURE)

  it('conta 69 giorni utili sulla finestra del dataset demo', () => {
    expect(calendario.giorni).toHaveLength(69)
    expect(calendario.numeroSettimane).toBe(14)
  })

  it('esclude Ognissanti e nessun altro giorno in quella finestra', () => {
    expect(calendario.esclusi).toEqual([
      { data: '2024-11-01', motivo: 'Ognissanti', indiceGiorno: 4, settimana: 6 },
    ])
  })

  it('colloca il giorno escluso nella settimana giusta, accanto ai suoi giorni utili', () => {
    const [ognissanti] = calendario.esclusi
    const stessaSettimana = calendario.giorni.filter((g) => g.settimana === ognissanti.settimana)
    expect(stessaSettimana).toHaveLength(4)
    expect(stessaSettimana.map((g) => g.indiceGiorno)).toEqual([0, 1, 2, 3])
  })

  it('non produce mai sabati o domeniche', () => {
    for (const giorno of calendario.giorni) expect(giorno.indiceGiorno).toBeLessThanOrEqual(4)
  })

  it('numera le settimane in modo crescente e senza salti', () => {
    const settimane = [...new Set(calendario.giorni.map((g) => g.settimana))]
    expect(settimane).toEqual(settimane.map((_, i) => i))
  })

  it('distribuisce le occorrenze: solo il venerdi ne perde una per Ognissanti', () => {
    expect(occorrenzePerGiorno(calendario)).toEqual([14, 14, 14, 14, 13])
  })

  it('rifiuta una finestra invertita', () => {
    expect(() => calendarioDi('2024-12-20', '2024-09-16', [])).toThrow(/precede/)
  })
})
