/** Festivita' nazionali italiane. Sono legge: stanno nel codice, non nei dati editabili. */

/** Algoritmo di Meeus/Jones/Butcher: domenica di Pasqua nel calendario gregoriano. */
export function domenicaDiPasqua(anno: number): Date {
  const a = anno % 19
  const b = Math.floor(anno / 100)
  const c = anno % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31)
  const giorno = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(anno, mese - 1, giorno))
}

/** `YYYY-MM-DD` in UTC, cosi' il fuso locale non sposta mai una data di un giorno. */
export function aIso(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function daIso(iso: string): Date {
  const [anno, mese, giorno] = iso.split('-').map(Number)
  if (!anno || !mese || !giorno) throw new Error(`Data ISO non valida: "${iso}"`)
  return new Date(Date.UTC(anno, mese - 1, giorno))
}

export function sommaGiorni(data: Date, giorni: number): Date {
  return new Date(data.getTime() + giorni * 24 * 60 * 60 * 1000)
}

const FISSE: ReadonlyArray<[mese: number, giorno: number, nome: string]> = [
  [1, 1, 'Capodanno'],
  [1, 6, 'Epifania'],
  [4, 25, 'Festa della Liberazione'],
  [5, 1, 'Festa del Lavoro'],
  [6, 2, 'Festa della Repubblica'],
  [8, 15, 'Ferragosto'],
  [11, 1, 'Ognissanti'],
  [12, 8, 'Immacolata Concezione'],
  [12, 25, 'Natale'],
  [12, 26, 'Santo Stefano'],
]

const GIORNI_DOPO_PASQUA_PASQUETTA = 1

/** Mappa `YYYY-MM-DD` -> nome della festivita', per un dato anno. */
export function festivitaItaliane(anno: number): Map<string, string> {
  const festivita = new Map<string, string>()
  for (const [mese, giorno, nome] of FISSE) {
    festivita.set(aIso(new Date(Date.UTC(anno, mese - 1, giorno))), nome)
  }
  const pasqua = domenicaDiPasqua(anno)
  festivita.set(aIso(pasqua), 'Pasqua')
  festivita.set(aIso(sommaGiorni(pasqua, GIORNI_DOPO_PASQUA_PASQUETTA)), 'Lunedi dell Angelo')
  return festivita
}
