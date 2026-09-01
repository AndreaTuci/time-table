import { describe, expect, it } from 'vitest'
import { dividiInBlocchi, quotePerClasse } from './quote'
import type { Materia } from './types'

const SETTIMANE = 14
const materia = (id: string, oreTotali: number, bloccoOre: number, maxOreGiorno: number): Materia =>
  ({ id, oreTotali, bloccoOre, maxOreGiorno, tipoAula: 'AULA' })

const DEMO = [
  materia('CULTURA GENERALE', 100, 2, 4),
  materia('MATEMATICA', 120, 2, 4),
  materia('CULTURA TECNICA', 100, 2, 4),
  materia('INFORMATICA', 80, 4, 8),
  materia('LABORATORIO IDRAULICO', 60, 4, 8),
]

describe('dividiInBlocchi', () => {
  it('divide esattamente quando le ore sono multiple del blocco', () => {
    expect(dividiInBlocchi(materia('X', 100, 2, 4))).toEqual(new Array(50).fill(2))
    expect(dividiInBlocchi(materia('X', 80, 4, 8))).toEqual(new Array(20).fill(4))
  })

  it('assorbe il resto allungando alcuni blocchi, senza lasciare ore spaiate', () => {
    const blocchi = dividiInBlocchi(materia('X', 101, 2, 4))
    expect(blocchi.reduce((a, b) => a + b)).toBe(101)
    expect(Math.min(...blocchi)).toBeGreaterThanOrEqual(2)
    expect(Math.max(...blocchi)).toBeLessThanOrEqual(4)
  })

  it('somma sempre alle ore totali, per qualunque combinazione plausibile', () => {
    for (let ore = 1; ore <= 200; ore++) {
      for (const blocco of [1, 2, 3, 4]) {
        const totale = dividiInBlocchi(materia('X', ore, blocco, 8)).reduce((a, b) => a + b, 0)
        expect(totale).toBe(ore)
      }
    }
  })

  it('rifiuta un blocco piu lungo del tetto giornaliero', () => {
    expect(() => dividiInBlocchi(materia('X', 100, 6, 4))).toThrow(/supera max_ore_giorno/)
  })
})

describe('quotePerClasse — le ore totali devono cadere esatte', () => {
  // 14 settimane: tredici da 5 giorni e quella di Ognissanti da 4. Totale 69 giorni utili.
  const GIORNI_SETTIMANA = [5, 5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 5]
  const quote = quotePerClasse(DEMO, GIORNI_SETTIMANA)

  const oreDellaSettimana = (w: number) =>
    quote.reduce((ore, q) => ore + q.blocchiPerSettimana[w] * q.durate[0], 0)

  it('programma esattamente le ore totali di ogni materia', () => {
    for (const [i, q] of quote.entries()) {
      expect(q.blocchiPerSettimana.reduce((a, b) => a + b, 0)).toBe(q.durate.length)
      expect(q.durate.reduce((a, b) => a + b, 0)).toBe(DEMO[i].oreTotali)
    }
  })

  it('non supera mai il tetto di 8 ore al giorno, nemmeno nella settimana corta', () => {
    for (const [w, giorni] of GIORNI_SETTIMANA.entries()) {
      expect(oreDellaSettimana(w) / giorni).toBeLessThanOrEqual(8)
    }
  })

  it('tiene ogni giornata sopra le 6 ore, altrimenti il corso non chiude in tempo', () => {
    for (const [w, giorni] of GIORNI_SETTIMANA.entries()) {
      expect(oreDellaSettimana(w) / giorni).toBeGreaterThanOrEqual(6)
    }
  })

  it('da alla settimana di Ognissanti meno ore, non le stesse compresse', () => {
    const corta = oreDellaSettimana(6)
    const piena = oreDellaSettimana(0)
    expect(corta).toBeLessThan(piena)
    expect(SETTIMANE).toBe(GIORNI_SETTIMANA.length)
  })

  it('somma 460 ore, il totale della classe', () => {
    const totale = GIORNI_SETTIMANA.map((_, w) => oreDellaSettimana(w)).reduce((a, b) => a + b, 0)
    expect(totale).toBe(460)
  })
})
