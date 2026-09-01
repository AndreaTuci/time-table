/**
 * Genera il dataset demo a partire da definizioni compatte e leggibili.
 *
 * Le disponibilita' dei docenti si scrivono con un mini-DSL a fasce orarie
 * ("08-13,15-19" = disponibile dalle 8 alle 13 e dalle 15 alle 19) invece che
 * come 55 booleani a testa: si leggono, si confrontano e si ritarano a mano.
 *
 * Uso:  node scripts/genera-dataset.mjs > data/dataset-demo.json
 */

const ORA_INIZIO = 8
const ORA_FINE = 19
const PAUSA_PRANZO = '13.00-14.00'
const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven']

const SLOT = Array.from({ length: ORA_FINE - ORA_INIZIO }, (_, i) => {
  const da = String(ORA_INIZIO + i).padStart(2, '0')
  const a = String(ORA_INIZIO + i + 1).padStart(2, '0')
  return `${da}.00-${a}.00`
})

/** "08-13,15-19" -> insieme delle ore di inizio coperte. Stringa vuota = mai disponibile. */
function espandiFasce(fasce) {
  const ore = new Set()
  if (!fasce.trim()) return ore
  for (const fascia of fasce.split(',')) {
    const [da, a] = fascia.trim().split('-').map(Number)
    if (!Number.isInteger(da) || !Number.isInteger(a) || da >= a) {
      throw new Error(`Fascia oraria non valida: "${fascia}"`)
    }
    for (let ora = da; ora < a; ora++) ore.add(ora)
  }
  return ore
}

function disponibilitaDa(settimana) {
  const risultato = {}
  for (const giorno of GIORNI) {
    const ore = espandiFasce(settimana[giorno] ?? '')
    risultato[giorno] = Object.fromEntries(
      SLOT.map((slot, i) => [slot, ore.has(ORA_INIZIO + i)])
    )
  }
  return risultato
}

/** Ore realmente utilizzabili in una settimana: la pausa pranzo non conta. */
function oreUtili(disponibilita) {
  return GIORNI.reduce((totale, giorno) => {
    const slotGiorno = disponibilita[giorno]
    return totale + SLOT.filter((s) => s !== PAUSA_PRANZO && slotGiorno[s]).length
  }, 0)
}

// I due docenti dell'esempio dell'utente, con le loro disponibilita' esatte tradotte in fasce.
// pino: lun 8-13 e 15-19 | mar mai | mer 8-12 e 15-19 | gio 12-19 | ven 8-13
// carla: lun 15-19 | mar 8-11 | mer 8-12 e 15-19 | gio 12-14 | ven mai
const DOCENTI = [
  { nome: 'pino palloncino',   materie: ['CULTURA GENERALE'],
    settimana: { lun: '08-13,15-19', mar: '',      mer: '08-12,15-19', gio: '12-19', ven: '08-13' } },
  { nome: 'carla capecchi',    materie: ['CULTURA TECNICA'],
    settimana: { lun: '15-19',       mar: '08-11', mer: '08-12,15-19', gio: '12-14', ven: '' } },

  // CULTURA GENERALE — servono ~21,4 h/settimana su 3 classi.
  { nome: 'nadia brunelli',    materie: ['CULTURA GENERALE'],
    settimana: { lun: '08-13', mar: '08-13', mer: '', gio: '08-13', ven: '08-13,14-16' } },

  // MATEMATICA — la materia piu' pesante: 360 h totali, ~25,7 h/settimana.
  { nome: 'enrico dalla valle', materie: ['MATEMATICA'],
    settimana: { lun: '08-13', mar: '08-13', mer: '08-13', gio: '08-13', ven: '08-13' } },
  { nome: 'sara meloni',        materie: ['MATEMATICA'],
    settimana: { lun: '14-19', mar: '14-19', mer: '14-19', gio: '14-19', ven: '' } },
  { nome: 'gianni turrini',     materie: ['MATEMATICA'],
    settimana: { lun: '', mar: '08-13,14-18', mer: '08-13,14-18', gio: '', ven: '08-13,14-18' } },

  // CULTURA TECNICA — ~21,4 h/settimana, e carla ne copre solo 16.
  { nome: 'marco ferretti',     materie: ['CULTURA TECNICA', 'LABORATORIO ELETTRICO'],
    settimana: { lun: '08-13,14-19', mar: '08-13,14-19', mer: '', gio: '08-13,14-19', ven: '14-19' } },
  { nome: 'ivana ruggeri',      materie: ['CULTURA TECNICA'],
    settimana: { lun: '08-12', mar: '14-19', mer: '08-13,14-17', gio: '08-13', ven: '08-12' } },

  // INFORMATICA — 240 h totali ma un solo laboratorio: le classi si alternano per forza.
  { nome: 'luca bevilacqua',    materie: ['INFORMATICA'],
    settimana: { lun: '08-13', mar: '08-13,14-18', mer: '08-13', gio: '', ven: '08-13' } },
  { nome: 'elisa pagano',       materie: ['INFORMATICA'],
    settimana: { lun: '14-19', mar: '', mer: '14-19', gio: '08-13,14-19', ven: '14-18' } },

  // LABORATORIO ELETTRICO — 120 h su ELE ed ELE2, un solo laboratorio.
  { nome: 'roberto sanna',      materie: ['LABORATORIO ELETTRICO'],
    settimana: { lun: '08-13,14-18', mar: '08-13', mer: '08-13,14-18', gio: '08-13,14-18', ven: '' } },

  // LABORATORIO IDRAULICO — 60 h sulla sola IDRA.
  { nome: 'franco iemmolo',     materie: ['LABORATORIO IDRAULICO'],
    settimana: { lun: '08-13,14-18', mar: '', mer: '08-13,14-18', gio: '08-13', ven: '08-13,14-18' } },
  { nome: 'teresa quaranta',    materie: ['LABORATORIO IDRAULICO'],
    settimana: { lun: '', mar: '08-13,14-18', mer: '', gio: '14-19', ven: '08-13' } },
]

const AULE = {
  'AULA A': 'AULA',
  'AULA B': 'AULA',
  'AULA C': 'AULA',
  'AULA D': 'LAB-ELETTRICO',
  'AULA E': 'LAB-IDRAULICO',
  'AULA F': 'LAB-INFORMATICO',
}

// blocco_ore = durata minima di una lezione consecutiva. max_ore_giorno = tetto giornaliero,
// per materia e non globale: un laboratorio puo' prendersi mezza o tutta la giornata.
const CORSI = {
  'CULTURA GENERALE':      { ore_totali: 100, tipo_aula: 'AULA',            blocco_ore: 2, max_ore_giorno: 4 },
  'MATEMATICA':            { ore_totali: 120, tipo_aula: 'AULA',            blocco_ore: 2, max_ore_giorno: 4 },
  'CULTURA TECNICA':       { ore_totali: 100, tipo_aula: 'AULA',            blocco_ore: 2, max_ore_giorno: 4 },
  'INFORMATICA':           { ore_totali:  80, tipo_aula: 'LAB-INFORMATICO', blocco_ore: 4, max_ore_giorno: 8 },
  'LABORATORIO ELETTRICO': { ore_totali:  60, tipo_aula: 'LAB-ELETTRICO',   blocco_ore: 4, max_ore_giorno: 8 },
  'LABORATORIO IDRAULICO': { ore_totali:  60, tipo_aula: 'LAB-IDRAULICO',   blocco_ore: 4, max_ore_giorno: 8 },
}

const DATA_INIZIO = '2024-09-16'
const DATA_FINE = '2024-12-20'

const CLASSI = {
  IDRA: {
    data_inizio: DATA_INIZIO, data_fine: DATA_FINE, aula_casa: 'AULA A',
    ore_giorno_min: 6, ore_giorno_max: 8,
    materie: ['CULTURA GENERALE', 'MATEMATICA', 'CULTURA TECNICA', 'INFORMATICA', 'LABORATORIO IDRAULICO'],
  },
  ELE: {
    data_inizio: DATA_INIZIO, data_fine: DATA_FINE, aula_casa: 'AULA B',
    ore_giorno_min: 6, ore_giorno_max: 8,
    materie: ['CULTURA GENERALE', 'MATEMATICA', 'CULTURA TECNICA', 'INFORMATICA', 'LABORATORIO ELETTRICO'],
  },
  ELE2: {
    data_inizio: DATA_INIZIO, data_fine: DATA_FINE, aula_casa: 'AULA C',
    ore_giorno_min: 6, ore_giorno_max: 8,
    materie: ['CULTURA GENERALE', 'MATEMATICA', 'CULTURA TECNICA', 'INFORMATICA', 'LABORATORIO ELETTRICO'],
  },
}

const dataset = {
  configurazione: {
    slot: SLOT,
    giorni: GIORNI,
    pausa_pranzo: PAUSA_PRANZO,
  },
  insegnanti: DOCENTI.map(({ nome, materie, settimana }) => {
    const disponibilita = disponibilitaDa(settimana)
    return { [nome]: { materie, ore_settimanali_disponibili: oreUtili(disponibilita), disponibilita } }
  }),
  aule: AULE,
  corsi: CORSI,
  classi: CLASSI,
}

process.stdout.write(JSON.stringify(dataset, null, 2) + '\n')
