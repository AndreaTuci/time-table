import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { auleRighe, chiusureRighe, classiRighe, corsiRighe, docentiRighe } from './inputCsv'
import { orarioClasseRighe, orarioRighe } from './scheduleCsv'
import { caricaModello } from '@/engine/loader'
import { generaOrario, type EsitoOrario } from '@/engine/solver'
import type { Modello } from '@/engine/types'

let modello: Modello
let esito: EsitoOrario

beforeAll(() => {
  modello = caricaModello(
    JSON.parse(readFileSync('data/dataset-demo.json', 'utf8')),
    JSON.parse(readFileSync('data/chiusure.json', 'utf8'))
  )
  esito = generaOrario(modello)
})

describe('toCsv', () => {
  it('protegge separatori, virgolette e a capo, e solo quelli', () => {
    expect(toCsv([['piano', 'a;b', 'lui disse "ciao"', 'due\nrighe']])).toBe(
      'piano;"a;b";"lui disse ""ciao""";"due\nrighe"'
    )
  })

  it('scrive i booleani come SI e NO, perche il file lo legge una persona', () => {
    expect(toCsv([[true, false]])).toBe('SI;NO')
  })

  it('separa le righe con CRLF, come si aspetta Excel', () => {
    expect(toCsv([['a'], ['b']])).toBe('a\r\nb')
  })
})

describe('dati di ingresso', () => {
  it('esporta una riga per docente e per giorno', () => {
    const righe = docentiRighe(modello)
    expect(righe).toHaveLength(modello.docenti.length * 5 + 1)
    expect(righe[0].slice(0, 3)).toEqual(['docente', 'materie', 'giorno'])
  })

  it('marca la pausa pranzo invece di dichiararla non disponibile', () => {
    const pausa = modello.slot.indexOf(modello.pausaPranzo)
    const primaRiga = docentiRighe(modello)[1]
    // Tre colonne di testa precedono le fasce orarie.
    expect(primaRiga[3 + pausa]).toBe('pausa')
  })

  it('riporta le ore utili coerenti con quelle calcolate dal motore', () => {
    const righe = docentiRighe(modello).slice(1)
    for (const docente of modello.docenti) {
      const sue = righe.filter((r) => r[0] === docente.nome)
      const somma = sue.reduce((totale, r) => totale + Number(r[r.length - 1]), 0)
      expect(somma).toBe(docente.oreSettimanaliDisponibili)
    }
  })

  it('esporta corsi, classi, aule e chiusure con una riga per elemento', () => {
    expect(corsiRighe(modello)).toHaveLength(Object.keys(modello.materie).length + 1)
    expect(classiRighe(modello)).toHaveLength(Object.keys(modello.classi).length + 1)
    expect(auleRighe(modello)).toHaveLength(modello.aule.length + 1)
    expect(chiusureRighe(modello)).toHaveLength(modello.chiusure.length + 1)
  })
})

describe('orario generato', () => {
  it('esporta una riga per ora di lezione', () => {
    expect(orarioRighe(modello, esito)).toHaveLength(esito.lezioni.length + 1)
  })

  it('usa il nome del docente e non il suo identificativo', () => {
    const riga = orarioRighe(modello, esito)[1]
    expect(riga[5]).not.toContain('-')
    expect(modello.docenti.some((d) => d.nome === riga[5])).toBe(true)
  })

  it('la griglia di classe ha una riga per giorno di lezione e una colonna per fascia', () => {
    const righe = orarioClasseRighe(modello, esito, 'IDRA')
    const giorniConLezione = new Set(
      esito.lezioni.filter((l) => l.classe === 'IDRA').map((l) => l.data)
    )
    expect(righe).toHaveLength(giorniConLezione.size + 1)
    expect(righe[0]).toHaveLength(modello.slot.length + 2)
  })

  it('la griglia di classe lascia vuota la pausa pranzo', () => {
    const pausa = modello.slot.indexOf(modello.pausaPranzo)
    for (const riga of orarioClasseRighe(modello, esito, 'IDRA').slice(1)) {
      expect(riga[2 + pausa]).toBe('')
    }
  })
})
