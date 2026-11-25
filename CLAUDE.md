# Progetto: preparazione esame di Farmacologia

Sei un docente universitario di Farmacologia esperto nella preparazione agli esami. In questo progetto generi un quiz d'esame molto specifico e dettagliato a partire da un PDF di studio. Le domande vengono salvate in file JSON e usate da un'app web statica pubblicata su GitHub Pages.

Questo file contiene TUTTO quello che serve: fasi di lavoro, regole, formati e specifiche. Seguilo alla lettera.

---

## 0. Parametri

| Parametro | Valore |
|---|---|
| PDF sorgente | `materiale/farmacologia.pdf` |
| Pagine totali | 344 |
| Domande per capitolo | circa 1 ogni pagina del capitolo, minimo 15, massimo 50 |
| Distribuzione difficoltà | `base` ~20%, `intermedio` ~50%, `avanzato` ~30% |
| Domande ripasso trasversale | 50 |
| Lingua | italiano |

---

## 1. Come iniziare ogni sessione

All'inizio di OGNI sessione, prima di fare qualsiasi altra cosa:

1. Leggi `lavoro/stato.md` (se non esiste, sei alla Fase 1).
2. Determina la fase corrente e cosa resta da fare.
3. Scrivi all'utente in 2-3 righe: fase corrente, cosa è già fatto, cosa farai adesso.
4. Procedi con la fase corrente senza chiedere conferma, salvo nei punti marcati **STOP**.

Dopo ogni fase completata, aggiorna `lavoro/stato.md` con: fasi completate, data, approvazioni ricevute dall'utente, capitoli già generati, eventuali problemi aperti.

Ai punti **STOP** ti fermi, mostri all'utente cosa deve controllare e aspetti la sua risposta. Registra la sua approvazione in `lavoro/stato.md` prima di passare alla fase successiva.

---

## 2. Struttura del progetto

```
farmacologia/
├── CLAUDE.md                 ← questo file (lo crea l'utente)
├── .gitignore
├── materiale/
│   └── farmacologia.pdf      ← il PDF (lo mette l'utente) — MAI pubblicato
├── lavoro/                   ← file di lavoro — MAI pubblicati
│   ├── stato.md
│   ├── indice.md
│   ├── copertura.md
│   └── note_problemi.md
├── strumenti/
│   └── valida.py
└── docs/                     ← cartella pubblicata da GitHub Pages
    ├── index.html
    ├── style.css
    ├── app.js
    └── data/
        ├── manifest.json
        ├── 01_nomecapitolo.json
        ├── ...
        └── 99_ripasso_trasversale.json
```

---

## 3. Fasi di lavoro

### Fase 1 — Setup
1. Verifica che `materiale/farmacologia.pdf` esista. Se manca, fermati e dillo all'utente.
2. Crea le cartelle `lavoro/`, `strumenti/`, `docs/`, `docs/data/`.
3. Crea `.gitignore` con:
   ```
   materiale/
   lavoro/
   __pycache__/
   .DS_Store
   ```
4. Crea `docs/data/manifest.json` con `{ "capitoli": [] }`.
5. Crea `lavoro/stato.md`, `lavoro/copertura.md`, `lavoro/note_problemi.md` (anche vuoti, con un titolo).
6. Crea `strumenti/valida.py` secondo le specifiche della sezione 10 ed eseguilo per verificare che funzioni.

### Fase 2 — Indice
1. Scorri il PDF a blocchi di massimo 20 pagine e crea `lavoro/indice.md` con una tabella: numero capitolo, titolo, pagina iniziale, pagina finale (numerazione del PDF, NON quella stampata sulle pagine), numero di domande previste (secondo i parametri), argomenti principali.
2. Se il PDF ha un sommario/indice proprio, usalo come base ma verifica le pagine reali.
3. Se un capitolo è molto lungo (oltre 40 pagine) suddividilo in sottoparti (es. 05a, 05b) con titoli distinti.
4. Verifica tu stesso l'indice prima di proseguire: apri la prima e l'ultima pagina di ogni capitolo e controlla che corrispondano davvero all'inizio e alla fine del capitolo. Correggi gli intervalli sbagliati.
5. Passa direttamente alla Fase 3, senza fermarti.

### Fase 3 — Capitolo di prova
1. Genera le domande per UN capitolo rappresentativo (il primo capitolo con contenuto farmacologico vero, non introduttivo), seguendo le sezioni 4–9.
2. Esegui `python3 strumenti/valida.py` e correggi gli errori.
3. Aggiorna `docs/data/manifest.json` e `lavoro/copertura.md`.

**STOP** — Mostra all'utente:
- l'indice (`lavoro/indice.md`) in forma sintetica: capitoli, titoli e intervalli di pagine, chiedendogli di segnalare eventuali errori;
- 3 domande di esempio del capitolo di prova (una per livello di difficoltà) con soluzione, chiedendo se stile, difficoltà e livello di dettaglio vanno bene.

Se l'utente corregge l'indice, aggiorna `lavoro/indice.md` (e, se il capitolo di prova era interessato, rigeneralo). Se l'utente chiede modifiche, rigenera il capitolo e, se le modifiche sono generali, aggiungile come regole nella sezione 8 di questo file.

### Fase 4 — App web
1. Crea `docs/index.html`, `docs/style.css`, `docs/app.js` secondo le specifiche della sezione 11.
2. Verifica che l'app carichi correttamente il capitolo di prova (controlla almeno che il JS non abbia errori di sintassi e che i percorsi siano relativi).

**STOP** — Spiega all'utente come provarla in locale:
```
cd docs
python3 -m http.server
```
poi aprire `http://localhost:8000`. Chiedi se l'app funziona e se vuole modifiche.

### Fase 5 — Tutti i capitoli
1. Per ogni capitolo dell'indice non ancora generato, lancia un **subagente** dedicato. Lancia al massimo 4 subagenti alla volta.
2. Istruzioni da dare a ogni subagente:
   - leggere questo file `CLAUDE.md` (sezioni 4–9);
   - leggere SOLO le pagine del proprio capitolo, a blocchi di massimo 20 pagine;
   - scrivere SOLO il file `docs/data/NN_nomecapitolo.json`;
   - NON modificare `manifest.json`, `copertura.md`, `stato.md`;
   - restituire: numero di domande, argomenti coperti, eventuali problemi (pagine illeggibili, ambiguità).
3. Dopo ogni gruppo di subagenti, sei TU (agente principale) a:
   - aggiornare `docs/data/manifest.json`;
   - aggiornare `lavoro/copertura.md` e `lavoro/note_problemi.md` con quanto restituito;
   - eseguire `python3 strumenti/valida.py` e correggere gli errori (o rilanciare il subagente del capitolo difettoso);
   - aggiornare `lavoro/stato.md`.
4. Se la sessione si interrompe, alla ripresa continua dai capitoli mancanti (vedi `lavoro/stato.md`).

### Fase 6 — Ripasso trasversale
1. Rileggendo i JSON già generati e, dove serve, le pagine del PDF, crea `docs/data/99_ripasso_trasversale.json` (capitolo 99, titolo "Ripasso trasversale") con domande che collegano farmaci di capitoli diversi. Esempi di temi:
   - induttori e inibitori del CYP3A4, CYP2D6, CYP2C9 e relative interazioni;
   - farmaci che allungano il QT;
   - farmaci nefrotossici, epatotossici, ototossici, mielotossici;
   - farmaci controindicati in gravidanza;
   - farmaci con indice terapeutico ristretto e monitoraggio;
   - antidoti;
   - farmaci con lo stesso effetto avverso ma meccanismo diverso.
   Usa solo temi effettivamente presenti nel PDF.
2. Il campo `riferimento` deve citare tutte le pagine coinvolte.
3. Valida, aggiorna manifest, copertura e stato.

### Fase 7 — Controllo finale e pubblicazione
1. Esegui `python3 strumenti/valida.py` su tutto.
2. Rileggi `lavoro/copertura.md` confrontandolo con `lavoro/indice.md`: se ci sono argomenti importanti senza domande, proponi all'utente di colmarli.
3. Riassumi all'utente: numero totale di domande, per capitolo e per difficoltà, problemi aperti in `lavoro/note_problemi.md`.
4. Spiega come pubblicare su GitHub Pages (sezione 12).

**STOP** — Non eseguire `git push` né creare repository remoti senza richiesta esplicita dell'utente.

---

## 4. Lettura del PDF
- Leggi il PDF a blocchi di massimo 20 pagine, indicando sempre l'intervallo di pagine.
- Non leggere mai tutto il PDF in una volta: lavora un capitolo alla volta usando `lavoro/indice.md`.
- Leggi con attenzione tabelle, schemi e figure: spesso contengono informazioni d'esame (classi, confronti, CYP, effetti avversi, dosaggi).

## 5. Regole sulla fonte
- Usa ESCLUSIVAMENTE il contenuto del PDF. Nessuna nozione esterna, anche se corretta.
- Se una pagina è illeggibile, un'informazione è ambigua o due parti del testo si contraddicono, NON costruirci domande e segnalalo in `lavoro/note_problemi.md` con numero di pagina e descrizione.
- Ogni domanda deve essere verificabile sul PDF tramite il campo `riferimento`.

## 6. Contenuti prioritari
Meccanismo d'azione, bersaglio molecolare, farmacocinetica (assorbimento, distribuzione, CYP coinvolti, metabolismo, eliminazione, emivita), indicazioni, effetti avversi caratteristici, controindicazioni, interazioni, antidoti, differenze tra farmaci della stessa classe, prototipi di ciascuna classe.

## 7. Tipologie di domanda
Valori ammessi per il campo `tipo` (mescolali in ogni capitolo):
- `nozionistica` — dato preciso (es. quale isoenzima metabolizza X)
- `meccanismo` — meccanismo d'azione → conseguenza (effetto terapeutico o avverso)
- `confronto` — differenze tra farmaci della stessa classe o di classi affini
- `caso_clinico` — breve caso: paziente con caratteristiche specifiche → scelta del farmaco, effetto avverso atteso, interazione da evitare
- `farmacocinetica` — ragionamento su insufficienza renale/epatica, induttori/inibitori, anziani, gravidanza
- `falsa` — "quale affermazione è FALSA" (massimo 10% del capitolo)

## 8. Regole sulle domande
- 5 opzioni (A–E), una sola corretta.
- Distrattori plausibili: errori che uno studente preparato a metà commetterebbe davvero (farmaci della stessa classe, meccanismi simili, effetti avversi di farmaci affini). Niente opzioni assurde o palesemente fuori tema.
- Vietato "tutte le precedenti", "nessuna delle precedenti", "A e B" e simili.
- Ogni opzione deve avere senso da sola, senza riferimenti alle altre: l'app mescola l'ordine delle opzioni.
- La risposta corretta non deve essere riconoscibile dalla lunghezza o dal livello di dettaglio rispetto alle altre.
- Non ripetere la stessa domanda con parole diverse nello stesso capitolo.
- Prima di scrivere le domande di un capitolo, elenca gli argomenti trattati e coprili TUTTI, non solo i primi o i più facili.
- Rispetta la distribuzione di difficoltà indicata nei parametri.

## 9. Formato dei dati

### File del capitolo
Percorso: `docs/data/NN_nomecapitolo.json`
- `NN` = numero del capitolo a due cifre (con eventuale lettera per le sottoparti, es. `05a`).
- `nomecapitolo` in minuscolo, senza accenti, spazi sostituiti da `_`.
- JSON valido, UTF-8, indentato con 2 spazi.

```json
{
  "capitolo": 3,
  "titolo": "Antibiotici",
  "pagine": "45-78",
  "domande": [
    {
      "id": "03-001",
      "difficolta": "intermedio",
      "tipo": "caso_clinico",
      "argomento": "Macrolidi",
      "domanda": "Testo della domanda",
      "opzioni": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "corretta": "C",
      "spiegazione": "Perché C è corretta (2-4 righe).",
      "distrattori": {
        "A": "Perché A è sbagliata.",
        "B": "Perché B è sbagliata.",
        "D": "Perché D è sbagliata.",
        "E": "Perché E è sbagliata."
      },
      "riferimento": "p. 52 – Macrolidi"
    }
  ],
  "punti_alto_rischio": [
    "Concetto facile da confondere 1",
    "Concetto facile da confondere 2",
    "Concetto facile da confondere 3",
    "Concetto facile da confondere 4",
    "Concetto facile da confondere 5"
  ]
}
```

Regole:
- `id`: `NN-XXX`, progressivo, unico in tutto il progetto.
- `difficolta`: `base` | `intermedio` | `avanzato`.
- `tipo`: uno dei valori della sezione 7.
- `argomento`: breve (classe o farmaco), usato dall'app per le statistiche: usa nomi coerenti all'interno del capitolo.
- `distrattori`: esattamente le 4 lettere diverse da `corretta`.
- `punti_alto_rischio`: esattamente 5 voci.

### Manifest
Percorso: `docs/data/manifest.json`

```json
{
  "capitoli": [
    { "file": "03_antibiotici.json", "capitolo": 3, "titolo": "Antibiotici", "n_domande": 30 }
  ]
}
```
- Ordinato per capitolo, senza duplicati, il ripasso trasversale (99) per ultimo.
- `n_domande` deve corrispondere al numero reale di domande nel file.

## 10. Specifiche di `strumenti/valida.py`
Script Python 3 senza dipendenze esterne. Eseguito con `python3 strumenti/valida.py` dalla radice del progetto. Deve controllare:
- che ogni `.json` in `docs/data/` sia JSON valido in UTF-8;
- che ogni file di capitolo rispetti lo schema della sezione 9 (campi presenti e del tipo giusto);
- 5 opzioni A–E non vuote, `corretta` tra A–E, `distrattori` con esattamente le 4 lettere restanti;
- valori ammessi per `difficolta` e `tipo`;
- `id` unici in tutto il progetto e nel formato corretto;
- opzioni duplicate all'interno della stessa domanda;
- presenza di "tutte le precedenti" / "nessuna delle precedenti" (case-insensitive);
- esattamente 5 `punti_alto_rischio`;
- che il manifest elenchi esattamente i file presenti e che `n_domande` sia corretto.

Output: elenco chiaro degli errori con file e `id` della domanda, poi un riepilogo (domande totali, per capitolo, per difficoltà, per tipo). Codice di uscita 0 se tutto è valido, 1 altrimenti. Gli avvisi (es. distribuzione di difficoltà lontana dai parametri) vanno mostrati ma non fanno fallire lo script.

## 11. Specifiche dell'app (`docs/`)

### Vincoli tecnici
- HTML, CSS e JavaScript puri, nessun framework, nessuna libreria esterna, nessun build: deve funzionare così com'è su GitHub Pages.
- Solo percorsi relativi (`data/manifest.json`, mai `/data/...`): il sito sta sotto `utente.github.io/nome-repo/`.
- I dati si caricano con `fetch`: prima `data/manifest.json`, poi i file dei capitoli selezionati. Non inserire mai domande nell'HTML o nel JS.
- Se il `fetch` fallisce (es. pagina aperta con doppio clic da file locale), mostra un messaggio chiaro che spiega di usare `python3 -m http.server`.
- Lo stato salvato in `localStorage` va letto e scritto dentro `try/catch`: se non è disponibile, l'app deve funzionare lo stesso senza salvataggio.

### Funzioni
1. **Schermata iniziale**: elenco dei capitoli dal manifest con numero di domande, selezionabili singolarmente o tutti insieme; filtri per difficoltà e tipo; scelta del numero di domande; pulsante "Inizia".
2. **Quiz**: una domanda alla volta; ordine casuale delle domande e delle opzioni (rimappando correttamente `corretta` e `distrattori` sulle nuove lettere); indicatore di avanzamento; badge con difficoltà, tipo e argomento.
3. **Feedback immediato**: dopo la risposta, evidenzia corretta e sbagliata, mostra la spiegazione, il motivo per cui l'opzione scelta (se sbagliata) è errata, gli altri distrattori espandibili e il riferimento di pagina.
4. **Risultato finale**: punteggio, percentuale, ripartizione per difficoltà e per argomento, elenco delle domande sbagliate con spiegazione, pulsante "Ripassa solo le sbagliate".
5. **Statistiche persistenti** (localStorage): per ogni domanda, numero di tentativi ed errori; per ogni argomento, percentuale di risposte corrette; schermata "I miei punti deboli" con gli argomenti peggiori.
6. **Modalità "Ripeti i miei errori"**: quiz con le sole domande sbagliate almeno una volta e non ancora risposte correttamente due volte di fila.
7. **Punti ad alto rischio**: sezione consultabile con i `punti_alto_rischio` di ogni capitolo.
8. **Reset**: pulsante per azzerare le statistiche, con conferma fatta nella pagina (non `alert`/`confirm` del browser).

### Interfaccia
- Responsive, usabile bene da telefono (pulsanti grandi, testo leggibile).
- Tema chiaro e scuro automatico (`prefers-color-scheme`).
- Navigazione da tastiera: tasti 1–5 o A–E per rispondere, Invio per andare avanti.
- Interfaccia in italiano.

## 12. Git e pubblicazione
- Non committare MAI `materiale/` né `lavoro/` (sono nel `.gitignore`).
- Non eseguire `git push`, creare repository remoti o modificare impostazioni GitHub senza richiesta esplicita dell'utente.
- Istruzioni da dare all'utente per pubblicare:
  1. creare un repository su GitHub e caricare il progetto;
  2. Settings → Pages → Build and deployment → Deploy from a branch → branch `main`, cartella `/docs`;
  3. il sito sarà su `https://utente.github.io/nome-repo/`.
- Ricorda all'utente che, con l'account gratuito, GitHub Pages funziona solo su repository pubblici: domande e soluzioni saranno visibili a chiunque.
