import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { classiBloccate, diagnostica } from './diagnostica'
import { caricaModello } from './loader'
import { generaOrario } from './solver'

/**
 * Il test che conta di piu' e' il primo: sul dataset di esempio, che il motore risolve, la
 * diagnostica non deve dire NIENTE. Un controllo che dichiara impossibile un orario risolvibile
 * e' peggio di nessun controllo, perche' toglie ogni motivo per credere agli altri messaggi.
 */

const grezzo = () => JSON.parse(readFileSync('data/dataset-demo.json', 'utf8'))
const chiusure = () => JSON.parse(readFileSync('data/chiusure.json', 'utf8'))

const modelloCon = (modifica: (dati: Record<string, any>) => void = () => {}) => {
  const dati = grezzo()
  modifica(dati)
  return caricaModello(dati, chiusure())
}

describe('diagnostica', () => {
  it('non segnala nulla sul dataset di esempio, che e fattibile', () => {
    expect(diagnostica(modelloCon())).toEqual([])
  })

  it('riconosce la finestra troppo stretta e dice di quanto', () => {
    const modello = modelloCon((dati) => {
      dati.classi.IDRA.data_fine = '2024-10-16'
    })
    const problemi = diagnostica(modello)
    const bloccante = problemi.find((p) => p.classe === 'IDRA' && p.gravita === 'bloccante')

    expect(bloccante).toBeDefined()
    expect(bloccante!.messaggio).toContain('460 ore')
    // Il rimedio non e' un consiglio generico: contiene una data oppure un numero di ore.
    expect(bloccante!.rimedio).toMatch(/\d{4}-\d{2}-\d{2}|\d+ ore/)
    expect(problemi.some((p) => p.classe === 'ELE')).toBe(false)
  })

  it('una classe impossibile non fa perdere l orario alle altre', () => {
    const modello = modelloCon((dati) => {
      dati.classi.IDRA.data_fine = '2024-10-16'
    })
    const esito = generaOrario(modello)

    expect(esito.classiEscluse).toEqual(['IDRA'])
    expect(esito.lezioni.some((l) => l.classe === 'IDRA')).toBe(false)

    // ELE ed ELE2 restano pianificate per intero: erano innocenti.
    for (const riga of esito.copertura.filter((c) => c.classe !== 'IDRA')) {
      expect(`${riga.classe}/${riga.materia}=${riga.oreProgrammate}`).toBe(
        `${riga.classe}/${riga.materia}=${riga.oreRichieste}`
      )
    }
    expect(esito.settimaneNonRisolte).toEqual([])
  })

  it('riconosce una materia senza docenti', () => {
    const modello = modelloCon((dati) => {
      dati.insegnanti = dati.insegnanti.filter((voce: Record<string, any>) => {
        const [nome] = Object.keys(voce)
        return !voce[nome].materie.includes('MATEMATICA')
      })
    })
    const problemi = diagnostica(modello)
    expect(problemi.some((p) => p.messaggio.includes('Nessun docente insegna MATEMATICA'))).toBe(true)
    expect(classiBloccate(problemi)).toEqual(new Set(['IDRA', 'ELE', 'ELE2']))
  })

  it('riconosce un blocco piu lungo di qualunque finestra libera dei docenti', () => {
    // Sei ore consecutive non stanno in nessuna mezza giornata: la mattina ne offre cinque
    // (08-13) e il pomeriggio altrettante, e una lezione non scavalca la pausa.
    const modello = modelloCon((dati) => {
      dati.corsi['LABORATORIO IDRAULICO'].blocco_ore = 6
      dati.corsi['LABORATORIO IDRAULICO'].max_ore_giorno = 8
    })
    const problemi = diagnostica(modello)
    const trovato = problemi.find((p) => p.titolo === 'Nessuna finestra abbastanza lunga')
    expect(trovato).toBeDefined()
    expect(trovato!.classe).toBe('IDRA')
  })

  it('riconosce un tipo di aula che non esiste', () => {
    const modello = modelloCon((dati) => {
      delete dati.aule['AULA F']
    })
    const problemi = diagnostica(modello)
    expect(problemi.some((p) => p.titolo === 'Tipo di aula inesistente')).toBe(true)
  })

  it('riconosce una finestra che non contiene giorni utili', () => {
    const modello = modelloCon((dati) => {
      dati.classi.ELE.data_inizio = '2024-12-21'
      dati.classi.ELE.data_fine = '2024-12-22'
    })
    const problemi = diagnostica(modello)
    expect(problemi.some((p) => p.classe === 'ELE' && p.titolo === 'Nessun giorno utile')).toBe(true)
  })
})
