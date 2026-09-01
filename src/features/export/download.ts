/** Il pezzo che tocca il DOM, tenuto fuori dai moduli che compongono il CSV cosi restano puri. */

/** Excel legge gli accenti solo se il file si apre con il BOM: senza, "Cultura Generale" si rompe. */
const BOM = '﻿'

export function scaricaCsv(nomeFile: string, contenuto: string): void {
  const blob = new Blob([BOM, contenuto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeFile
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
