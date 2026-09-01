import type { Modello } from './types'

/**
 * Assegna a ogni coppia (classe, materia) il docente titolare che la seguira' per tutto il corso.
 *
 * E' come funziona una scuola vera, e semplifica il resto: la collocazione settimanale non deve
 * piu' scegliere anche il docente, e la funzione sostituzioni ha finalmente un "titolare" da
 * sostituire. Le coppie con meno candidati scelgono per prime, e a parita' vince il docente
 * con piu' ore libere: le materie coperte da un solo docente non restano mai a bocca asciutta.
 */

export interface Titolare {
  classe: string
  materia: string
  docente: string
  /** Ore che questo incarico impegna ogni settimana. */
  oreSettimanali: number
}

export interface EsitoTitolari {
  titolari: Titolare[]
  problemi: string[]
}

interface Incarico {
  classe: string
  materia: string
  oreSettimanali: number
  candidati: string[]
}

function incarichiDa(modello: Modello, settimanePerClasse: Record<string, number>): Incarico[] {
  const incarichi: Incarico[] = []
  for (const classe of Object.values(modello.classi)) {
    for (const materia of classe.materie) {
      const dati = modello.materie[materia]
      if (!dati) continue
      incarichi.push({
        classe: classe.id,
        materia,
        oreSettimanali: dati.oreTotali / settimanePerClasse[classe.id],
        candidati: modello.docenti.filter((d) => d.materie.includes(materia)).map((d) => d.id),
      })
    }
  }
  return incarichi
}

export function assegnaTitolari(
  modello: Modello,
  settimanePerClasse: Record<string, number>
): EsitoTitolari {
  const incarichi = incarichiDa(modello, settimanePerClasse)
  const problemi: string[] = []
  const oreImpegnate = new Map<string, number>()
  const disponibilita = new Map(modello.docenti.map((d) => [d.id, d.oreSettimanaliDisponibili]))

  // Prima le materie con meno candidati: sono quelle che non possono permettersi una seconda scelta.
  const perScarsita = [...incarichi].sort(
    (a, b) =>
      a.candidati.length - b.candidati.length ||
      b.oreSettimanali - a.oreSettimanali ||
      a.classe.localeCompare(b.classe)
  )

  const titolari: Titolare[] = []
  for (const incarico of perScarsita) {
    if (incarico.candidati.length === 0) {
      problemi.push(`Nessun docente insegna "${incarico.materia}" (serve alla classe ${incarico.classe})`)
      continue
    }
    const scelto = incarico.candidati.reduce((migliore, candidato) => {
      const residuo = (id: string) => (disponibilita.get(id) ?? 0) - (oreImpegnate.get(id) ?? 0)
      return residuo(candidato) > residuo(migliore) ? candidato : migliore
    })
    oreImpegnate.set(scelto, (oreImpegnate.get(scelto) ?? 0) + incarico.oreSettimanali)
    titolari.push({ ...incarico, docente: scelto })
  }

  for (const [docente, ore] of oreImpegnate) {
    const disponibili = disponibilita.get(docente) ?? 0
    if (ore > disponibili) {
      problemi.push(
        `${docente}: gli incarichi valgono ${ore.toFixed(1)} h/settimana ma ne ha ${disponibili} disponibili`
      )
    }
  }
  return { titolari, problemi }
}
