import { describe, expect, it } from 'vitest'
import { applicaVariazioni, chiaveVariazione, type Variazione } from './variazioni'
import type { Lezione } from '@/engine/types'

const lezione = (over: Partial<Lezione> = {}): Lezione => ({
  data: '2024-10-08',
  indiceGiorno: 1,
  indiceSlot: 0,
  classe: 'IDRA',
  materia: 'CULTURA TECNICA',
  docente: 'marco-ferretti',
  aula: 'AULA A',
  ...over,
})

const DUE_ORE = [lezione({ indiceSlot: 0 }), lezione({ indiceSlot: 1 })]

describe('applicaVariazioni', () => {
  it('lascia l orario intatto quando non c e nessun ritocco', () => {
    expect(applicaVariazioni(DUE_ORE, [])).toBe(DUE_ORE)
  })

  it('la sostituzione cambia il docente e non tocca ora, aula ne classe', () => {
    const variazione: Variazione = {
      tipo: 'sostituzione',
      classe: 'IDRA',
      materia: 'CULTURA TECNICA',
      data: '2024-10-08',
      slot: [0, 1],
      docenteOriginale: 'marco-ferretti',
      docenteNuovo: 'carla-capecchi',
    }
    const dopo = applicaVariazioni(DUE_ORE, [variazione])
    expect(dopo).toHaveLength(2)
    for (const l of dopo) {
      expect(l.docente).toBe('carla-capecchi')
      expect(l.variazione).toBe('sostituzione')
      expect(l.aula).toBe('AULA A')
      expect(l.data).toBe('2024-10-08')
    }
  })

  it('non tocca le lezioni di altre classi o altre materie nello stesso slot', () => {
    const altra = lezione({ classe: 'ELE', docente: 'ivana-ruggeri' })
    const dopo = applicaVariazioni([...DUE_ORE, altra], [
      {
        tipo: 'sostituzione',
        classe: 'IDRA',
        materia: 'CULTURA TECNICA',
        data: '2024-10-08',
        slot: [0, 1],
        docenteOriginale: 'marco-ferretti',
        docenteNuovo: 'carla-capecchi',
      },
    ])
    expect(dopo.find((l) => l.classe === 'ELE')!.docente).toBe('ivana-ruggeri')
  })

  it('il recupero toglie le ore dal giorno saltato e le rimette in quello nuovo', () => {
    const dopo = applicaVariazioni(DUE_ORE, [
      {
        tipo: 'recupero',
        classe: 'IDRA',
        materia: 'CULTURA TECNICA',
        docente: 'marco-ferretti',
        data: '2024-10-08',
        slot: [0, 1],
        nuovaData: '2024-10-10',
        nuovoIndiceGiorno: 3,
        nuoviSlot: [6, 7],
        nuovaAula: 'AULA A',
      },
    ])
    expect(dopo.filter((l) => l.data === '2024-10-08')).toHaveLength(0)
    const nuove = dopo.filter((l) => l.data === '2024-10-10')
    expect(nuove.map((l) => l.indiceSlot)).toEqual([6, 7])
    expect(nuove.every((l) => l.variazione === 'recupero')).toBe(true)
    expect(nuove.every((l) => l.docente === 'marco-ferretti')).toBe(true)
  })

  it('non inventa ore: il recupero ne rimette quante ne ha tolte', () => {
    const dopo = applicaVariazioni(DUE_ORE, [
      {
        tipo: 'recupero',
        classe: 'IDRA',
        materia: 'CULTURA TECNICA',
        docente: 'marco-ferretti',
        data: '2024-10-08',
        slot: [0, 1],
        nuovaData: '2024-10-10',
        nuovoIndiceGiorno: 3,
        // Piu' slot di quante ore siano state tolte: quelli in eccesso vanno ignorati.
        nuoviSlot: [6, 7, 8, 9],
        nuovaAula: 'AULA A',
      },
    ])
    expect(dopo).toHaveLength(DUE_ORE.length)
  })

  it('applica i ritocchi in ordine: il secondo vede l esito del primo', () => {
    const dopo = applicaVariazioni(DUE_ORE, [
      {
        tipo: 'sostituzione',
        classe: 'IDRA',
        materia: 'CULTURA TECNICA',
        data: '2024-10-08',
        slot: [0, 1],
        docenteOriginale: 'marco-ferretti',
        docenteNuovo: 'carla-capecchi',
      },
      {
        tipo: 'sostituzione',
        classe: 'IDRA',
        materia: 'CULTURA TECNICA',
        data: '2024-10-08',
        slot: [0, 1],
        docenteOriginale: 'carla-capecchi',
        docenteNuovo: 'ivana-ruggeri',
      },
    ])
    expect(dopo.every((l) => l.docente === 'ivana-ruggeri')).toBe(true)
  })

  it('un ritocco che non trova nessuna lezione e un innocuo nulla di fatto', () => {
    const dopo = applicaVariazioni(DUE_ORE, [
      {
        tipo: 'recupero',
        classe: 'INESISTENTE',
        materia: 'CULTURA TECNICA',
        docente: 'marco-ferretti',
        data: '2024-10-08',
        slot: [0, 1],
        nuovaData: '2024-10-10',
        nuovoIndiceGiorno: 3,
        nuoviSlot: [6, 7],
        nuovaAula: 'AULA A',
      },
    ])
    expect(dopo).toEqual(DUE_ORE)
  })

  it('due ritocchi identici hanno la stessa chiave, e non si duplicano', () => {
    const uno: Variazione = {
      tipo: 'sostituzione',
      classe: 'IDRA',
      materia: 'CULTURA TECNICA',
      data: '2024-10-08',
      slot: [0, 1],
      docenteOriginale: 'marco-ferretti',
      docenteNuovo: 'carla-capecchi',
    }
    expect(chiaveVariazione(uno)).toBe(chiaveVariazione({ ...uno, docenteNuovo: 'altro' }))
  })
})
