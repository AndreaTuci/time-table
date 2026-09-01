# Plan — generatore di orario (prototipo demo)

> Status snapshot. Aggiornato in tempo reale.

- [x] Phase P1 — Modello dati esteso + dataset demo + calendario
- [x] Phase P2 — Motore di scheduling (orario tipo -> calendario) + test
- [x] Phase P3 — Scaffold UI — grezza, **sostituita da P4**
- [~] Phase P4 — Design system "Quadro" + tavola a tre classi — *in attesa di verifica*
- [ ] Phase P5 — Assenze, sostituzioni e recuperi in interfaccia
- [ ] Phase P6 — Deploy Cloudflare Pages + README
- [ ] Phase P7 — Rimessa in riga: rinomina in inglese, split dei file lunghi

### Regole di ingaggio (corrette dopo il richiamo dell'utente del 01/09)

| # | Regola | Stato |
|---|---|---|
| R1 | **I comandi li lancia l'utente.** Io scrivo il blocco esatto da incollare e aspetto l'esito. Mai `npm install`, `test`, `build`, e soprattutto **mai toccare il dev server**. | vincolante |
| R2 | **Codice in inglese**: identificatori, tipi, commenti, nomi file. Restano in italiano le chiavi dei dati (sono lo schema Django) e le stringhe a schermo (l'utente finale e' italiano). | dal codice nuovo in poi |
| R3 | **Un semaforo per fase.** Kickoff con le domande aperte, implementazione, review, recap con tabella dei commit, poi 🔴 e si aspetta. | vincolante |
| R4 | File ≤ ~200 righe, funzioni ≤ ~40. | vincolante |
| R5 | **Nessun commit da parte mia**, mai. | rispettata finora |

---

## Contesto congelato (deciso con l'utente, non rimettere in discussione)

| # | Decisione |
|---|---|
| D1 | Approccio **orario tipo**: griglia settimanale stabile per classe, proiettata sul calendario, con coda di riequilibrio perche' le ore totali cadano esatte. |
| D2 | Finestra **16/09/2024 -> 20/12/2024**: 14 settimane, 69 giorni utili, 6,67 h/giorno di media. Stretta di proposito ("costringerci a trovare soluzioni di incastro"). |
| D3 | Giornata 6-8 ore. Slot 08.00-13.00 e 14.00-19.00. **13.00-14.00 = pausa pranzo, mai occupata.** |
| D4 | **Tetto ore/giorno per materia**, non globale: i laboratori possono occupare 4h o 8h in un giorno, le materie d'aula max 4h. |
| D5 | Blocchi di **almeno 2h consecutive**. Mai ore isolate. |
| D6 | **Aula casa** per classe: le materie di tipo AULA si fanno sempre li', ci si sposta solo per i laboratori. |
| D7 | Chiusure: **preset italiano completo** (festivita' nazionali + Pasqua calcolata), in JSON separato ed editabile. |
| D8 | Stack: **Vue 3 + Vite + TS + Tailwind v4 + shadcn-vue**. Motore = modulo TS puro, zero dipendenze UI. Deploy statico su Cloudflare Pages free. |
| D9 | **Nessuna AI nel tool.** Algoritmo deterministico. |
| D10 | Lo schema JSON deve restare una mappatura ovvia di futuri modelli Django. |

## Vincoli del motore

**Hard** (violarli = orario invalido)
- Un docente non e' in due classi nello stesso slot.
- Un'aula non ospita due classi nello stesso slot.
- Il tipo aula corrisponde a quello richiesto dalla materia.
- Il docente e' disponibile in quello slot settimanale.
- Le ore totali per materia sono rispettate **esattamente**.
- Tutto entro `data_fine` della classe.

**Didattici** (configurabili, ma attivi di default)
- Blocco minimo per materia (2h aula, 4h laboratorio).
- Tetto ore/giorno per materia.
- Pausa pranzo libera.
- Aula casa per classe.
- Giornata fra `ore_giorno_min` e `ore_giorno_max`.

---

## Phase P1 — Modello dati esteso + dataset demo + calendario
**Goal**: esiste un dataset JSON completo e validato che descrive il problema per intero, e una
funzione che dice quali sono i giorni utili di una classe. Da qui in poi il motore ha tutto.

### Files
- [x] `src/engine/types.ts` — modello normalizzato (interfacce TS).
- [x] `src/engine/loader.ts` — JSON grezzo -> modello normalizzato, con validazione esplicita.
- [x] `src/engine/calendario.ts` + `festivita.ts` — Pasqua calcolata, giorni utili, settimane.
- [x] `data/dataset-demo.json` — 3 classi, 6 materie, 6 aule, **13 docenti**.
- [x] `data/chiusure.json` — festivita' e chiusure, editabili.
- [x] `scripts/genera-dataset.mjs` — rigenera il dataset con un DSL a fasce orarie.

### Out of scope per questa fase
- Qualsiasi logica di assegnamento. Qui si descrive il problema, non lo si risolve.

## Phase P2 — Motore di scheduling — CHIUSA
**Goal raggiunto**: `generaOrario(modello)` produce 1380 lezioni valide in ~1,9 s, con le ore
totali esatte su tutte e 15 le coppie classe-materia e 29 test verdi.

### Files
- [x] `src/engine/quote.ts` — ore totali -> blocchi -> quote settimanali proporzionali ai giorni utili.
- [x] `src/engine/titolari.ts` — un docente titolare per ogni coppia classe-materia.
- [x] `src/engine/giornata.ts` — compone la giornata di tutte le classi. **312 righe, da spezzare in P7.**
- [x] `src/engine/settimana.ts` — percorre i giorni, limiti superiori, ordine per difficolta'. **219 righe.**
- [x] `src/engine/solver.ts` — orchestrazione sul calendario.
- [x] `src/engine/sostituzioni.ts` — assenze, sostituti, recuperi. **204 righe.**
- [x] `src/engine/solver.test.ts` — 13 vincoli hard verificati sull'orario completo.
- [ ] ~~`risorse.ts`~~ — scritto e poi **abbandonato**: il nuovo algoritmo non lo usa. Da cancellare in P7.

## Phase P4 — Design system "Quadro" + tavola a tre classi
**Goal**: la demo ha un'identita' visiva propria e mostra tutto l'istituto su una tavola sola.

### Decisioni di kickoff
| # | Domanda | Risoluzione |
|---|---|---|
| Q9 | Direzione visiva? | **Quadro**: in italiano "quadro orario" e "quadro elettrico" sono la stessa parola, e questi allievi cablano davvero quei quadri. Fondo RAL 7035, colonna ore come morsettiera su guida DIN, cartiglio da disegno tecnico. |
| Q10 | Cosa sta a schermo insieme? | **Tutte e tre le classi**, affiancate dentro ogni giorno. La contesa sul laboratorio unico si vede per adiacenza invece di doverla cercare. |

### Files
- [x] `src/style.css` — token Quadro, chiaro e scuro, palette materie fuori da `@theme`.
- [x] `src/lib/utils.ts` — `cn()`, la base di shadcn-vue.
- [x] `src/lib/subjects.ts` — colori materia, etichette, nomi propri.
- [x] `src/components/ui/button/`, `src/components/ui/badge/` — primitive in stile shadcn-vue.
- [x] `src/features/schedule/geometry.ts` — righe della griglia, con la pausa come vuoto reale.
- [x] `src/features/schedule/blocks.ts` — ore consecutive fuse in una lezione sola.
- [x] `src/features/schedule/types.ts` — la cucitura fra il vocabolario italiano del motore e il codice inglese.
- [x] `src/features/schedule/TerminalRail.vue` — **l'elemento firma**: la guida DIN che si interrompe alla pausa.
- [x] `src/features/schedule/LessonTile.vue`, `ClassColumn.vue`, `TimetableBoard.vue`.
- [x] `src/features/schedule/TitleBlock.vue` — il cartiglio.
- [x] `src/features/schedule/WeekSpine.vue` — le 14 settimane, alte quanto le ore che portano.
- [x] `src/features/schedule/CoverageGauge.vue` — misuratore con tacca di bersaglio.
- [x] `src/composables/useScheduleGenerator.ts` — pilota il worker.
- [x] `src/App.vue` — riscritta.

### Fuori budget, dichiarato
La fase ha toccato **19 file**, non ≤12: il design system e la tavola non erano separabili
senza consegnare una fase a meta'. Registrato invece di nasconderlo.

## Phase P5 — Assenze, sostituzioni e recuperi in interfaccia
Il motore (`src/engine/sostituzioni.ts`) e' gia' scritto e non e' ancora collegato a nulla.
- [ ] Pannello: scegli docente e giorno -> lezioni saltate -> sostituto oppure recupero.
- [ ] Test del motore sostituzioni (oggi ne e' privo).

## Phase P5 — Assenze, sostituzioni e recuperi
- [ ] `src/engine/sostituzioni.ts` — chi puo' sostituire, dove si recupera.
- [ ] Flusso UI: scegli docente e data -> lezioni impattate -> sostituto o recupero -> applica.

## Phase P6 — Deploy
- [ ] Build statica, `wrangler.toml` / configurazione Pages, README con istruzioni.
