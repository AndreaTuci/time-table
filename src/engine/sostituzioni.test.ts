import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { caricaModello } from './loader'
import { generaOrario, type EsitoOrario } from './solver'
import { analizzaAssenza, blocchiDi, giorniConLezione } from './sostituzioni'
import type { Modello } from './types'

/**
 * Il modulo delle sostituzioni non era mai stato eseguito: e' stato scritto prima che il motore
 * vietasse alle lezioni di scavalcare la pausa pranzo. Questi test servono prima di tutto a
 * scoprire cosa nel frattempo si e' rotto.
 */

let modello: Modello
let esito: EsitoOrario
let giorniUtili: { data: string; indiceGiorno: number }[]

beforeAll(() => {
  modello = caricaModello(
    JSON.parse(readFileSync('data/dataset-demo.json', 'utf8')),
    JSON.parse(readFileSync('data/chiusure.json', 'utf8'))
  )
  esito = generaOrario(modello)
  giorniUtili = esito.calendario.giorni.map((g) => ({ data: g.data, indiceGiorno: g.indiceGiorno }))
})

/** Un docente e una data in cui insegna davvero: la premessa di ogni prova qui sotto. */
function unaAssenza() {
  const docente = esito.titolari[0].docente
  const data = giorniConLezione(esito.lezioni, docente)[3]
  return { docente, data }
}

describe('blocchiDi', () => {
  it('raggruppa le ore consecutive della stessa materia in una lezione sola', () => {
    const { docente, data } = unaAssenza()
    const blocchi = blocchiDi(esito.lezioni, docente, data)
    const oreSingole = esito.lezioni.filter((l) => l.docente === docente && l.data === data).length

    expect(blocchi.length).toBeGreaterThan(0)
    expect(blocchi.reduce((ore, b) => ore + b.slot.length, 0)).toBe(oreSingole)
    for (const blocco of blocchi) {
      expect(blocco.slot).toEqual(blocco.slot.map((_, i) => blocco.slot[0] + i))
    }
  })

  it('non fonde ore di classi diverse nello stesso blocco', () => {
    for (const data of giorniConLezione(esito.lezioni, 'marco-ferretti').slice(0, 5)) {
      for (const blocco of blocchiDi(esito.lezioni, 'marco-ferretti', data)) {
        const classi = new Set(
          esito.lezioni
            .filter((l) => l.data === data && blocco.slot.includes(l.indiceSlot) && l.docente === 'marco-ferretti')
            .map((l) => l.classe)
        )
        expect(classi).toEqual(new Set([blocco.classe]))
      }
    }
  })
})

describe('analizzaAssenza', () => {
  it('propone solo sostituti che insegnano quella materia e sono liberi in quello slot', () => {
    const { docente, data } = unaAssenza()
    for (const persa of analizzaAssenza(modello, esito.lezioni, giorniUtili, docente, data)) {
      for (const sostituto of persa.sostituti) {
        const candidato = modello.docenti.find((d) => d.id === sostituto.docente)!
        expect(candidato.id).not.toBe(docente)
        expect(candidato.materie).toContain(persa.blocco.materia)
        for (const slot of persa.blocco.slot) {
          expect(candidato.disponibile[persa.blocco.indiceGiorno][slot]).toBe(true)
          const occupato = esito.lezioni.some(
            (l) => l.data === data && l.indiceSlot === slot && l.docente === candidato.id
          )
          expect(occupato).toBe(false)
        }
      }
    }
  })

  it('non propone mai un recupero a cavallo della pausa pranzo', () => {
    const pausa = modello.slot.indexOf(modello.pausaPranzo)
    const spezzati: string[] = []
    for (const titolare of esito.titolari) {
      for (const data of giorniConLezione(esito.lezioni, titolare.docente).slice(0, 4)) {
        for (const persa of analizzaAssenza(modello, esito.lezioni, giorniUtili, titolare.docente, data)) {
          for (const recupero of persa.recuperi) {
            const consecutivi = recupero.slot.every((s, i) => i === 0 || s === recupero.slot[i - 1] + 1)
            if (!consecutivi || recupero.slot.includes(pausa)) {
              spezzati.push(`${persa.blocco.classe} ${recupero.data} slot ${recupero.slot.join(',')}`)
            }
          }
        }
      }
    }
    expect(spezzati).toEqual([])
  })

  it('colloca i recuperi solo in giorni successivi e dentro la finestra della classe', () => {
    const { docente, data } = unaAssenza()
    for (const persa of analizzaAssenza(modello, esito.lezioni, giorniUtili, docente, data)) {
      const classe = modello.classi[persa.blocco.classe]
      for (const recupero of persa.recuperi) {
        expect(recupero.data > data).toBe(true)
        expect(recupero.data <= classe.dataFine).toBe(true)
      }
    }
  })

  it('lascia la giornata contigua: un recupero si attacca in testa o in coda, mai in mezzo', () => {
    const { docente, data } = unaAssenza()
    for (const persa of analizzaAssenza(modello, esito.lezioni, giorniUtili, docente, data)) {
      for (const recupero of persa.recuperi) {
        const gia = esito.lezioni
          .filter((l) => l.classe === persa.blocco.classe && l.data === recupero.data)
          .map((l) => modello.slotUtili.indexOf(l.indiceSlot))
        const nuove = recupero.slot.map((s) => modello.slotUtili.indexOf(s))
        const tutte = [...gia, ...nuove].sort((a, b) => a - b)
        expect(tutte).toEqual(tutte.map((_, i) => tutte[0] + i))
      }
    }
  })

  it('non fa sforare il tetto giornaliero della classe', () => {
    const { docente, data } = unaAssenza()
    for (const persa of analizzaAssenza(modello, esito.lezioni, giorniUtili, docente, data)) {
      const classe = modello.classi[persa.blocco.classe]
      for (const recupero of persa.recuperi) {
        const gia = esito.lezioni.filter(
          (l) => l.classe === persa.blocco.classe && l.data === recupero.data
        ).length
        expect(gia + recupero.slot.length).toBeLessThanOrEqual(classe.oreGiornoMax)
      }
    }
  })

  it('dichiara irrecuperabile solo cio che non ha ne sostituti ne recuperi', () => {
    const { docente, data } = unaAssenza()
    for (const persa of analizzaAssenza(modello, esito.lezioni, giorniUtili, docente, data)) {
      expect(persa.irrecuperabile).toBe(persa.sostituti.length === 0 && persa.recuperi.length === 0)
    }
  })
})
