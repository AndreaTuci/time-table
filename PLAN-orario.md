# Plan — generatore di orario (prototipo demo)

> Status snapshot. Aggiornato in tempo reale.

- [x] Phase P1 — Modello dati esteso + dataset demo + calendario
- [x] Phase P2 — Motore di scheduling (orario tipo -> calendario) + test
- [x] Phase P3 — Scaffold UI — grezza, **sostituita da P4**
- [x] Phase P4 — Design system "Quadro" + tavola a tre classi — *verificata dall'utente*
- [~] Phase P4.1 — Tema chiaro e filtro materie — *in attesa di verifica*
- [x] Phase P5 — Pagine entita': docenti, corsi, classi, aule (sola lettura)
- [x] Phase P6 — Editing su localStorage
- [x] Phase P6.1 — Diagnostica pre-volo e isolamento della classe impossibile
- [x] Phase P7 — Export CSV
- [~] Phase P8 — Assenze, sostituzioni e recuperi in interfaccia — *da verificare*
- [ ] Phase P9 — Deploy Cloudflare Pages + README
- [ ] Phase P10 — Rimessa in riga: rinomina in inglese, split dei file lunghi

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

## Phase P4.1 — Tema chiaro e filtro materie
Correzioni chieste dall'utente dopo la verifica di P4.
- [x] `src/style.css` — **solo tema chiaro** (`color-scheme: light`, blocco scuro rimosso) e
      palette schiarita: da grigio industriale a grigio da aula luminosa.
- [x] `src/features/schedule/SubjectFilter.vue` — interruttori delle materie, che fanno anche da
      legenda. Una materia spenta viene **attenuata, non cancellata**: un'ora sparita si
      leggerebbe come un'ora libera, e sarebbe falso.
- [x] `TimetableBoard.vue`, `ClassColumn.vue`, `App.vue` — filtro collegato.

## Phase P5 — Pagine entita' (sola lettura)
**Goal**: la demo smette di essere una schermata sola.

### Scelte di struttura
- Le pagine leggono il **modello normalizzato** prodotto dal loader del motore, non il JSON
  grezzo: interfaccia e solver vedono gli stessi dati, con gli stessi valori di default.
  In P6 bastera' rendere scrivibile quella sorgente.
- Lo stato del generatore vive **a livello di modulo**: ogni pagina legge lo stesso orario. Uno
  generato per vista sarebbe non solo sprecato ma potenzialmente *diverso*, perche' la ricerca
  ha pareggi da sciogliere.
- Routing sull'hash dell'URL, **senza vue-router**: una demo si condivide come link e deve
  sopravvivere a un reload. `hashchange` fa esattamente questo in una dozzina di righe.
- Docenti e aule condividono la stessa griglia settimanale: e' la stessa domanda, e un'aula e'
  semplicemente una risorsa i cui slot sono tutti aperti.

### Files
- [x] `src/composables/useHashRoute.ts` — routing sull'hash.
- [x] `src/data/source.ts` — sorgente unica, modello normalizzato piu' JSON grezzo per il worker.
- [x] `src/features/shell/AppTabs.vue` — selettore di pannello.
- [x] `src/features/insights/workload.ts` — carico docenti e uso settimanale degli slot.
- [x] `src/features/insights/WeekUsageGrid.vue` — griglia a **tre stati**: chiuso, aperto e libero,
      aperto e occupato. Lo slot libero e' capacita' inutilizzata, ed e' quello che spiega
      perche' il solver aveva margine.
- [x] `src/features/teachers/TeachersPage.vue` — elenco con saturazione, disponibilita', incarichi.
- [x] `src/features/courses/CoursesPage.vue` — le quattro cifre che decidono come una materia cade.
- [x] `src/features/classes/ClassesPage.vue` — finestra, avanzamento, ultima lezione effettiva.
- [x] `src/features/rooms/RoomsPage.vue` — occupazione settimanale per aula.
- [x] `src/features/schedule/SchedulePage.vue` — estratta da `App.vue`.
- [x] `src/App.vue` — ridotta a guscio: 73 righe.

## Phase P6 — Editing su localStorage
**Goal**: chi guarda la demo puo' cambiare i dati e rigenerare l'orario.
Modificabile (deciso con l'utente): **disponibilita' docenti**, **date di inizio e fine**,
**ore totali e tetti per materia**. Fuori scope: creare o eliminare anagrafiche.
- [x] `src/data/store.ts` — dataset reattivo, persistito su localStorage, con ripristino.
      Il JSON grezzo resta la verita': e' cio' che va passato al worker ed e' la forma che un
      giorno arrivera' da Django. Le viste leggono il modello normalizzato derivato.
- [x] `src/components/ui/number-field/` — campo numerico per le tabelle dense.
- [x] Disponibilita' cliccabile: `WeekUsageGrid` diventa una fila di interruttori.
- [x] Ore totali, blocco e tetto giornaliero modificabili dalla pagina corsi.
- [x] Date di inizio e fine modificabili dalla pagina classi.
- [x] Banda di avviso quando l'orario a schermo e' stato generato prima delle modifiche.
- [x] `src/data/store.test.ts` — 6 test sullo store.
- [x] `src/engine/loader.test.ts` — 4 test, fra cui quello sul conteggio delle ore disponibili.

## Phase P6.1 — Diagnostica pre-volo
**Goal**: quando i dati non permettono un orario, il tool lo dice PRIMA di cercare, con numeri e
con un rimedio; e una classe impossibile non trascina con se' le altre.

### Il principio, non negoziabile
Ogni controllo e' una **condizione necessaria dimostrabile**: se scatta, l'orario non esiste.
Dichiarare impossibile un orario risolvibile sarebbe peggio che tacere, perche' toglierebbe a chi
guarda l'unico motivo per fidarsi. Dove un limite piu' stretto sarebbe stato solo probabile si e'
scelto quello piu' largo e certo: qualche istanza impossibile passera' inosservata e la scoprira'
la ricerca. E' il verso giusto in cui sbagliare.

- [x] `src/engine/diagnostica.ts` — capienza della classe, materia senza docenti, blocco piu'
      lungo di ogni finestra libera, tipo di aula inesistente, finestra senza giorni utili.
- [x] `src/engine/solver.ts` — le classi bloccate escono PRIMA della ricerca: prima una classe
      impossibile faceva fallire la settimana anche a quelle sane.
- [x] `src/features/shell/DiagnosticsPanel.vue` — pannello in cima, ogni riga con il suo rimedio.
- [x] `src/features/classes/ClassesPage.vue` — la classe esclusa e' marcata "non pianificabile".
- [x] `src/engine/diagnostica.test.ts` — 7 test, fra cui **l'assenza di falsi positivi** sul
      dataset di esempio e la garanzia che una classe impossibile non danneggi le altre.

## Phase P7 — Export CSV
**Il documento principale sono i DATI A MONTE**, non l'orario: serve mostrare cosa e' entrato nel
generatore, perche' e' quello che rende verificabile cio' che ne e' uscito.

### Scelte
- Separatore `;` e BOM in testa: chi apre questi file lo fa con Excel in italiano, che con la
  virgola ammassa tutto in una colonna e senza BOM sbaglia gli accenti.
- Nessuna dipendenza: niente ZIP, niente libreria CSV. Un bottone per file.
- La composizione del CSV e' pura e testabile; il DOM sta in un modulo a parte.

### Files
- [x] `src/features/export/csv.ts` — `toCsv` con protezione di separatori, virgolette e a capo.
- [x] `src/features/export/inputCsv.ts` — docenti (una riga per docente e giorno), corsi, classi,
      aule, chiusure.
- [x] `src/features/export/scheduleCsv.ts` — orario completo (una riga per ora) e griglia per classe.
- [x] `src/features/export/download.ts` — la parte che tocca il DOM, isolata.
- [x] `src/features/export/ExportPage.vue` — scheda "dati", ingresso in cima e uscita sotto.
- [x] `src/features/export/csv.test.ts` — 11 test.

## Phase P8 — Assenze, sostituzioni e recuperi in interfaccia
Era la richiesta con cui l'utente ha aperto il lavoro. Il motore era scritto da tempo ma **non era
mai stato eseguito**: i test hanno scoperto subito un difetto.

- [x] `src/engine/sostituzioni.test.ts` — 8 test. Uno ha trovato il bug: i recuperi venivano
      proposti a cavallo della pausa pranzo (slot 4 e poi 6), perche' il modulo era stato scritto
      prima che il motore vietasse lo scavalcamento. Corretto con lo stesso controllo del solver.
- [x] `Recupero.indiceGiorno` — il giorno della settimana viene dal motore invece di essere
      ricavato dalla data dentro il template.
- [x] `src/features/absences/AbsencePage.vue` — scegli docente e giorno, vedi cosa salta.
- [x] `src/features/absences/LostLessonCard.vue` — le due uscite affiancate: sostituto sul posto
      oppure recupero con lo stesso titolare. **Nessuna delle due viene applicata**: la domanda e'
      "che cosa succede se", e la scelta e' della scuola.

## Phase P5 — Assenze, sostituzioni e recuperi
- [ ] `src/engine/sostituzioni.ts` — chi puo' sostituire, dove si recupera.
- [ ] Flusso UI: scegli docente e data -> lezioni impattate -> sostituto o recupero -> applica.

## Phase P6 — Deploy
- [ ] Build statica, `wrangler.toml` / configurazione Pages, README con istruzioni.
