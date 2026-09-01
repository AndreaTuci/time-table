/// <reference lib="webworker" />
import { caricaModello } from './loader'
import { generaOrario, type EsitoOrario } from './solver'
import type { Chiusura } from './types'

/**
 * Il motore gira qui, fuori dal thread dell'interfaccia.
 *
 * La generazione esplora molte combinazioni e puo' durare qualche secondo: lasciarla sul thread
 * principale bloccherebbe la pagina. In produzione questo modulo diventa una task asincrona
 * lato server senza cambiare una riga del motore.
 */

export interface RichiestaGenerazione {
  dati: Record<string, unknown>
  chiusure: Chiusura[]
}

export type RispostaGenerazione =
  | { stato: 'avanzamento'; settimana: number; totali: number }
  | { stato: 'fatto'; esito: EsitoOrario }
  | { stato: 'errore'; messaggio: string; problemi: string[] }

self.onmessage = (evento: MessageEvent<RichiestaGenerazione>) => {
  try {
    const modello = caricaModello(evento.data.dati, evento.data.chiusure)
    const esito = generaOrario(modello, {
      onSettimana: (settimana, totali) =>
        self.postMessage({ stato: 'avanzamento', settimana, totali } satisfies RispostaGenerazione),
    })
    self.postMessage({ stato: 'fatto', esito } satisfies RispostaGenerazione)
  } catch (errore) {
    const problemi = errore instanceof Error && 'problemi' in errore ? (errore.problemi as string[]) : []
    self.postMessage({
      stato: 'errore',
      messaggio: errore instanceof Error ? errore.message : String(errore),
      problemi,
    } satisfies RispostaGenerazione)
  }
}
