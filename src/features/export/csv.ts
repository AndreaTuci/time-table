/**
 * CSV, scritto a mano perche' una dipendenza per questo sarebbe sproporzionata.
 *
 * Separatore `;` e non `,`: chi apre questi file lo fa con Excel in italiano, che con la virgola
 * ammassa tutto in una colonna sola. La stessa ragione per cui davanti al contenuto va un BOM,
 * altrimenti gli accenti diventano illeggibili — ma quello lo mette chi scarica, non chi compone.
 */

const SEPARATORE = ';'
const DA_PROTEGGERE = /[;"\n\r]/

export type Cella = string | number | boolean

function cella(valore: Cella): string {
  if (typeof valore === 'boolean') return valore ? 'SI' : 'NO'
  const testo = String(valore)
  if (!DA_PROTEGGERE.test(testo)) return testo
  return `"${testo.replace(/"/g, '""')}"`
}

/** Righe -> testo CSV. La prima riga e' l'intestazione, come in qualunque foglio. */
export function toCsv(righe: Cella[][]): string {
  return righe.map((riga) => riga.map(cella).join(SEPARATORE)).join('\r\n')
}

export interface FileCsv {
  nome: string
  titolo: string
  descrizione: string
  righe: () => Cella[][]
}
