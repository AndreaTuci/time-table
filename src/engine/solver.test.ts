import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { caricaModello } from './loader'
import { generaOrario, type EsitoOrario } from './solver'
import type { Lezione, Modello } from './types'

/**
 * Il test che protegge davvero il motore: "le ore tornano" non dimostra che l'orario sia valido.
 * Qui si verifica ogni vincolo hard sull'orario completo del dataset demo.
 */

let modello: Modello
let esito: EsitoOrario

beforeAll(() => {
  modello = caricaModello(
    JSON.parse(readFileSync('data/dataset-demo.json', 'utf8')),
    JSON.parse(readFileSync('data/chiusure.json', 'utf8'))
  )
  esito = generaOrario(modello)
})

const perSlot = (chiave: (l: Lezione) => string) => {
  const conflitti: string[] = []
  const visti = new Map<string, Lezione>()
  for (const lezione of esito.lezioni) {
    const k = `${lezione.data}|${lezione.indiceSlot}|${chiave(lezione)}`
    const gia = visti.get(k)
    if (gia) conflitti.push(`${k}: ${gia.classe} e ${lezione.classe}`)
    else visti.set(k, lezione)
  }
  return conflitti
}

describe('generaOrario sul dataset demo', () => {
  it('risolve tutte le settimane senza segnalare problemi', () => {
    expect(esito.settimaneNonRisolte).toEqual([])
    expect(esito.problemi).toEqual([])
  })

  it('programma esattamente le ore totali di ogni materia in ogni classe', () => {
    for (const riga of esito.copertura) {
      expect(`${riga.classe}/${riga.materia}=${riga.oreProgrammate}`).toBe(
        `${riga.classe}/${riga.materia}=${riga.oreRichieste}`
      )
    }
  })

  it('non mette mai un docente in due classi alla stessa ora', () => {
    expect(perSlot((l) => l.docente)).toEqual([])
  })

  it('non mette mai due classi nella stessa aula alla stessa ora', () => {
    expect(perSlot((l) => l.aula)).toEqual([])
  })

  it('non mette mai due lezioni alla stessa classe alla stessa ora', () => {
    expect(perSlot((l) => l.classe)).toEqual([])
  })

  it('usa sempre un tipo di aula compatibile con la materia', () => {
    const tipo = new Map(modello.aule.map((a) => [a.id, a.tipo]))
    for (const l of esito.lezioni) {
      expect(`${l.materia} in ${l.aula}`).toBe(`${l.materia} in ${l.aula}`)
      expect(tipo.get(l.aula)).toBe(modello.materie[l.materia].tipoAula)
    }
  })

  it('rispetta l aula casa: le materie d aula non spostano mai la classe', () => {
    for (const l of esito.lezioni) {
      const classe = modello.classi[l.classe]
      const tipoCasa = modello.aule.find((a) => a.id === classe.aulaCasa)?.tipo
      if (modello.materie[l.materia].tipoAula === tipoCasa) expect(l.aula).toBe(classe.aulaCasa)
    }
  })

  it('assegna solo docenti che insegnano quella materia e sono disponibili', () => {
    const docenti = new Map(modello.docenti.map((d) => [d.id, d]))
    for (const l of esito.lezioni) {
      const docente = docenti.get(l.docente)!
      expect(docente.materie).toContain(l.materia)
      expect(docente.disponibile[l.indiceGiorno][l.indiceSlot]).toBe(true)
    }
  })

  it('non occupa mai la pausa pranzo', () => {
    const pausa = modello.slot.indexOf(modello.pausaPranzo)
    expect(esito.lezioni.some((l) => l.indiceSlot === pausa)).toBe(false)
  })

  it('tiene ogni lezione dentro la finestra della sua classe e fuori dalle chiusure', () => {
    const chiuse = new Set(esito.calendario.esclusi.map((e) => e.data))
    for (const l of esito.lezioni) {
      const classe = modello.classi[l.classe]
      expect(l.data >= classe.dataInizio && l.data <= classe.dataFine).toBe(true)
      expect(chiuse.has(l.data)).toBe(false)
    }
  })

  it('non supera il tetto giornaliero della classe ne quello della materia', () => {
    const oreClasse = new Map<string, number>()
    const oreMateria = new Map<string, number>()
    for (const l of esito.lezioni) {
      oreClasse.set(`${l.classe}|${l.data}`, (oreClasse.get(`${l.classe}|${l.data}`) ?? 0) + 1)
      const k = `${l.classe}|${l.materia}|${l.data}`
      oreMateria.set(k, (oreMateria.get(k) ?? 0) + 1)
    }
    for (const [k, ore] of oreClasse) {
      expect(ore).toBeLessThanOrEqual(modello.classi[k.split('|')[0]].oreGiornoMax)
    }
    for (const [k, ore] of oreMateria) {
      expect(ore).toBeLessThanOrEqual(modello.materie[k.split('|')[1]].maxOreGiorno)
    }
  })

  it('costruisce giornate contigue: nessuna ora-buco per gli studenti', () => {
    const perGiorno = new Map<string, number[]>()
    for (const l of esito.lezioni) {
      const k = `${l.classe}|${l.data}`
      perGiorno.set(k, [...(perGiorno.get(k) ?? []), modello.slotUtili.indexOf(l.indiceSlot)])
    }
    for (const [k, posizioni] of perGiorno) {
      const ordinate = [...posizioni].sort((a, b) => a - b)
      const attese = Array.from({ length: ordinate.length }, (_, i) => ordinate[0] + i)
      expect(`${k}:${ordinate.join(',')}`).toBe(`${k}:${attese.join(',')}`)
    }
  })

  it('assegna a ogni coppia classe-materia un solo docente titolare per tutto il corso', () => {
    const perIncarico = new Map<string, Set<string>>()
    for (const l of esito.lezioni) {
      const k = `${l.classe}|${l.materia}`
      perIncarico.set(k, (perIncarico.get(k) ?? new Set()).add(l.docente))
    }
    for (const [k, docenti] of perIncarico) expect(`${k}:${docenti.size}`).toBe(`${k}:1`)
  })
})
