import { describe, expect, it } from 'vitest'
import { caricaModello, ErroreDati } from './loader'

const SLOT = ['08.00-09.00', '09.00-10.00', '12.00-13.00', '13.00-14.00', '14.00-15.00']

const base = (disponibilita: Record<string, Record<string, boolean>>) => ({
  configurazione: { slot: SLOT, pausa_pranzo: '13.00-14.00' },
  insegnanti: [{ 'mario rossi': { materia: 'STORIA', disponibilita } }],
  aule: { 'AULA A': 'AULA' },
  corsi: { STORIA: { 'ORE TOTALI': 40, 'TIPO AULA': 'AULA' } },
  classi: { UNA: { data_inizio: '2024-09-16', data_fine: '2024-12-20', materie: ['STORIA'] } },
})

const giornoTutto = (valore: boolean) => Object.fromEntries(SLOT.map((s) => [s, valore]))
const settimana = (valore: boolean) =>
  Object.fromEntries(['lun', 'mar', 'mer', 'gio', 'ven'].map((g) => [g, giornoTutto(valore)]))

describe('caricaModello', () => {
  it('non conta la pausa pranzo fra le ore disponibili di un docente', () => {
    const modello = caricaModello(base(settimana(true)))
    // Cinque giorni per quattro slot utili: il quinto slot e' la pausa e non vale un'ora in piu'.
    expect(modello.docenti[0].oreSettimanaliDisponibili).toBe(20)
  })

  it('accetta il formato originale dell esempio: materia singola e chiavi maiuscole', () => {
    const modello = caricaModello(base(settimana(true)))
    expect(modello.docenti[0].materie).toEqual(['STORIA'])
    expect(modello.materie.STORIA.oreTotali).toBe(40)
    expect(modello.materie.STORIA.tipoAula).toBe('AULA')
  })

  it('assegna un aula casa alla classe quando i dati non la dichiarano', () => {
    expect(caricaModello(base(settimana(true))).classi.UNA.aulaCasa).toBe('AULA A')
  })

  it('raccoglie tutti i problemi invece di fermarsi al primo', () => {
    const dati = base(settimana(true)) as Record<string, unknown>
    dati.corsi = { STORIA: {} }
    dati.classi = {}
    try {
      caricaModello(dati)
      expect.unreachable('doveva sollevare ErroreDati')
    } catch (errore) {
      expect(errore).toBeInstanceOf(ErroreDati)
      expect((errore as ErroreDati).problemi.length).toBeGreaterThan(1)
    }
  })
})
