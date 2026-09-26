# AUDIT REPORT — iGOdelivering v1.29.2

**Commit di riferimento:** `c144d72` (branch `main`)
**Prima stesura:** 22 settembre 2026 — analisi statica del codice
**Revisione:** 22 settembre 2026 — verifica contro il database di produzione
**Ultimo aggiornamento:** 25 settembre 2026 — chiusura di A6, A7, A8, A12, C4, N9, N10, N11, N12; nuovo rilievo N13
**Perimetro:** 39.443 righe TypeScript/TSX in `src/` (100% dei file), 19 migration SQL, configurazione Next.js, documentazione, storico Git.

> **⚠️ Stato del codice al momento di questo aggiornamento.** I rilievi segnati
> ✅ in questa tornata (A6, A7, A8, A12, C4, N9, N10, N11) sono corretti e
> verificati con sonde sul database reale, ma **le modifiche al codice sono
> ancora nell'albero di lavoro e non committate**. Su `main` non c'è nulla di
> tutto questo. Le sole cose già presenti sul database di produzione sono le
> migration 018 e le colonne del token di attivazione; la 019 versiona queste
> ultime e non va eseguita.

---

## ⚠️ Nota metodologica — leggere prima della tabella

La prima stesura di questo report si basava sui file in `supabase/migrations/`, assumendo che descrivessero il database in esercizio. **Non lo descrivono.** Una ricognizione del catalogo di sistema (`scripts/inspect-schema.sql`) e una serie di sonde con la chiave anon hanno mostrato che produzione e migration divergono in entrambe le direzioni: alcune migration non sono mai state applicate, e alcune policy presenti in produzione non compaiono in nessuna migration.

Di conseguenza alcuni rilievi della prima stesura descrivevano una situazione diversa da quella reale. Vanno però distinti due casi che la prima revisione aveva confuso:

- **C1, C2 e A3 erano problemi reali, già chiusi da un intervento manuale diretto sul database** eseguito prima che l'audit avesse visibilità sul progetto. Non comparivano nella cronologia perché quell'intervento non ha lasciato un record formale, non perché il problema non fosse mai esistito. Sono nella sezione *Risolti — intervento diretto sul database*.
- **C5 e A5 erano effettivamente infondati o derivati** da altri rilievi, e restano nella sezione *Rilievi smentiti*.
- **C3 non appartiene a nessuna delle due categorie.** Non è stato smentito ma riformulato in **C3′**, ed è **risolto** dalla migration 017. La prima revisione lo elencava fra gli infondati; era un errore di classificazione, non una conclusione verificata.

Il fatto che la prima stesura li avesse tutti sbagliati, sia pure in modi diversi, è esso stesso il sintomo del problema di fondo: senza uno schema versionato e allineato non è possibile ragionare in modo affidabile sulla sicurezza del sistema, né distinguere un problema mai esistito da uno risolto senza lasciare traccia.

I rilievi qui sotto sono ora etichettati per **origine della verifica**:

- **[prod]** — verificato sul database di produzione o con una sonda applicativa
- **[codice]** — verificato leggendo il codice sorgente (non richiede il DB)

---

## Stato dei lavori al termine della sessione

| | |
|---|---|
| ✅ **Risolto** | intervento applicato in produzione e verificato |
| ✅◆ **Risolto fuori migration** | chiuso da un intervento manuale diretto sul database, privo di un record formale nella sequenza di migration |
| ⚠️ **Aperto** | confermato e non affrontato |
| ❌ **Smentito** | non sussiste |

---

## Tabella riassuntiva

| # | Area | Problema | Severità | Stato | Origine |
|---|------|----------|----------|-------|---------|
| **N1** | Vetrina | Vetrina pubblica invisibile: nessuna policy di lettura su `restaurants` | **Critico** | ✅ Risolto (mig. 015) | prod |
| **N2** | Checkout | Ordini e prenotazioni falliti e non salvati (`INSERT … RETURNING` senza policy SELECT) | **Critico** | ✅ Risolto | prod |
| **N3** | Storage | Path piatti incompatibili con le policy per tenant: upload bloccati | **Alto** | ✅ Risolto | prod |
| **N7** | Segreti | PAT GitHub in chiaro in `.git/config` | **Alto** | ✅ Rimosso e revocato | prod |
| **N9** | Ordini | Pagina di tracking sempre vuota: query anon su `orders` filtrata da RLS | **Alto** | ✅ Risolto | prod |
| **N10** | Promozioni | Promo `first_order` scavalcabile: il conteggio ordini torna sempre 0 | **Alto** | ✅ Risolto | prod |
| **N11** | Auth | Rollback di registrazione silenzioso: un utente Auth orfano blocca l'attivazione per sempre | **Alto** | ✅ Risolto | prod |
| **N12** | Schema | `activation_token`/`activation_token_expires_at` esistono in produzione ma in nessuna migration | Medio | ✅ Risolto (mig. 019) | prod |
| **N13** | Qualità | Altri 4 punti trattano un risultato vuoto da RLS come "non esiste" | Medio | ⚠️ Aperto | codice |
| C4 | Auth | `/api/ristoratore/register` autorizzava con `restaurantId` + email, entrambi noti | **Critico** | ✅ Risolto | prod |
| C6 | Pagamenti | Nessun gateway: l'ordine è creato senza alcun addebito | **Critico** | ⚠️ Aperto | codice |
| C7 | Pagamenti | PAN + CVV raccolti in chiaro in un form custom (PCI-DSS) | **Critico** | ⚠️ Aperto | codice |
| C8 | Pagamenti | Prezzi, sconto e totale calcolati dal client e inseriti senza validazione | **Critico** | ⚠️ Aperto | prod |
| C9 | Prenotazioni | Nessun controllo di capienza: overbooking illimitato | **Critico** | ⚠️ Aperto | codice |
| A1 | Auth | Ruolo letto da cookie non-httpOnly scritto dal client | **Alto** | ⚠️ Aperto | codice |
| A2 | Multi-tenant | `my_restaurant_id()` usa `LIMIT 1`: un owner con più locali ne governa uno solo | **Alto** | ⚠️ Aperto | prod |
| A4 | Multi-tenant | Codici sconto attivi enumerabili in anonimo (oggi 0 promo a sistema) | **Alto** | ⚠️ Aperto | prod |
| A6 | Ordini | Tracking per `order_number` con `maybeSingle()`: rotto su collisione fra ristoranti | **Alto** | ✅ Risolto | prod |
| A7 | Ordini | Lo stato `expired` non viene mai persistito | **Alto** | ✅ Risolto (mig. 016 + 018) | prod |
| A8 | Promozioni | `used_count` non incrementa: `max_uses` mai applicato | **Alto** | ✅ Risolto (mig. 018) | prod |
| A9 | Pagamenti | `stripe_connected`/`paypal_connected` auto-dichiarati | **Alto** | ⚠️ Aperto | codice |
| A10 | Pagamenti | Nessun flusso di rimborso, ma l'email di annullamento lo promette | **Alto** | ⚠️ Aperto | codice |
| A11 | Segreti | Chiave API Resend reale nello storico Git | **Alto** | ✅ Ruotata | codice |
| A12 | Auth | `/api/order/send-status-email` senza autenticazione | **Alto** | ✅ Risolto | prod |
| A13 | Prenotazioni | Nessuna gestione fusi orari | **Alto** | ⚠️ Aperto | codice |
| A14 | Performance | Zero indici sul database | **Alto** | ✅ Risolto (mig. 016) | prod |
| A15 | Dati | Il wizard cancella e reinserisce tutto il menu ad ogni salvataggio | **Alto** | ⚠️ Aperto | codice |
| C3′ | Multi-tenant | `restaurants` pubblica espone email proprietario e (futuri) dati bancari | Medio | ✅ Risolto (mig. 017) | prod |
| M1 | Multi-tenant | `platform_settings` leggibile da chiunque (oggi vuota) | Medio | ⚠️ Aperto | prod |
| M2 | Multi-tenant | Nessuna UPDATE self su `profiles`; nessuna UPDATE/DELETE su `order_items` | Medio | ⚠️ Aperto | prod |
| M3 | Prenotazioni | Slot già passati prenotabili per la giornata corrente | Medio | ⚠️ Aperto | codice |
| M4 | Prenotazioni | INSERT pubblico senza rate limit né captcha | Medio | ⚠️ Aperto | prod |
| M5 | Qualità | `ignoreBuildErrors` + `ignoreDuringBuilds` attivi | Medio | ⚠️ Aperto | codice |
| M6 | Qualità | 108 blocchi `catch` su 133 si limitano a `console.error` | Medio | ⚠️ Aperto | codice |
| M7 | Performance | Dashboard admin: `select('*')` su tutti gli ordini senza limite | Medio | ⚠️ Aperto | codice |
| M8 | Feature | `/admin/sicurezza` è un guscio vuoto | Medio | ⚠️ Aperto | codice |
| M9 | Dati | `published_at` non valorizzato dal wizard di creazione | Medio | ⚠️ Aperto | codice |
| **N4** | Dati | `loyalty_points` non esiste in produzione (è solo nella migration 001) | Basso | ⚠️ Aperto | prod |
| **N5** | Storage | Bucket `menu-images` in produzione, assente da migration e codice | Basso | ⚠️ Aperto | prod |
| **N6** | Dati | Realtime attivo su tutte e 11 le tabelle (la 005 ne prevedeva 2) | Basso | ⚠️ Aperto | prod |
| B2 | Dati | `orders_count` letto ma mai incrementato: sempre 0 | Basso | ⚠️ Aperto | codice |
| B3 | Codice | Moduli morti (`services/restaurants.ts`, `lib/formatters.ts`, …) | Basso | ⚠️ Aperto | codice |
| B4 | Docs | `docs/supabase_schema.md` descrive uno schema inesistente | Basso | ⚠️ Aperto | codice |
| C1 | Multi-tenant | `orders`/`order_items` leggibili da chiunque | **Critico** | ✅◆ Risolto fuori migration | prod |
| C2 | Multi-tenant | `bookings` leggibili da chiunque | **Critico** | ✅◆ Risolto fuori migration | prod |
| A3 | Storage | Storage senza separazione per tenant | **Alto** | ✅◆ Risolto fuori migration | prod |
| ~~C5~~ | ~~Privacy~~ | ~~"I miei ordini" espone lo storico altrui~~ | — | ❌ Smentito | prod |
| ~~A5~~ | ~~Ordini~~ | ~~`order_number` senza UNIQUE~~ | — | ❌ Smentito → vedi N8 | prod |
| **N8** | Ordini | Collisione `order_number` → INSERT rifiutato: il 2° cliente del giorno non ordina | **Alto** | ✅ Risolto | prod |

---

## Executive summary

Il progetto è funzionalmente ricco e l'interfaccia è completa. Al momento dell'audit, però, **la piattaforma era inutilizzabile dai clienti finali**: la vetrina pubblica non mostrava nulla a chi non era autenticato, e ordini e prenotazioni fallivano senza essere salvati. Entrambi i problemi erano invisibili dal pannello del ristoratore, che continuava a funzionare perché opera da utente autenticato. Sono stati individuati e corretti nel corso di questa sessione.

Chiusi quelli, restano tre lacune strutturali:

1. **Non esiste alcuna integrazione di pagamento.** Niente Stripe, niente PayPal, nessun webhook, nessuna colonna `payment_status` — verificato sullo schema reale. Il checkout raccoglie PAN e CVV in chiaro, li valida e li scarta: l'ordine viene creato senza che nulla venga addebitato.
2. **Gli importi sono decisi dal client.** `subtotal`, `discount`, `total` e il prezzo di ogni articolo arrivano dal browser e nessuna funzione server li ricalcola. Anche introducendo un gateway, si addebiterebbe la cifra scelta dal cliente.
3. **Le prenotazioni non hanno alcun controllo di capienza.** `tables_count` serve solo a generare i QR code. Nessun vincolo, nessun lock, nessun conteggio: l'overbooking è illimitato.

**Aggiornamento del 25 settembre.** Una seconda tornata ha chiuso i rilievi che dipendevano dal silenzio di RLS sulle operazioni lato client (A7, A8, N9, N10) e due sull'autenticazione delle route (C4, A12). Il filo conduttore dei primi quattro merita di essere isolato, perché è una classe di difetto e non quattro incidenti: **PostgreSQL non distingue "non esiste" da "non ti è permesso vederlo"**, e PostgREST restituisce in entrambi i casi un risultato vuoto con `error: null`. Ogni punto in cui il codice legge o scrive `orders`, `bookings` o `promos` con la chiave anon e interpreta il vuoto come stato legittimo è un guasto silenzioso in attesa. Quattro punti residui sono censiti in N13.

Il rimedio adottato è sempre lo stesso: spostare l'operazione dietro una funzione `SECURITY DEFINER` o una route con service role key, e farle restituire un esito esplicito — un boolean, un conteggio, un 404 — che il chiamante non possa confondere con un risultato vuoto.

L'isolamento multi-tenant, che la prima stesura indicava come area critica, **in produzione regge**: le policy per proprietario sono corrette, le API admin verificano il ruolo server-side prima di usare la service role key, e le letture pubbliche indiscriminate ipotizzate non esistono. Il problema reale non è che le RLS siano permissive — è che **nessuno sa con certezza quali siano**, perché lo schema non era versionato e le migration non corrispondono alla produzione.

---

## Risolti — intervento diretto sul database, non riflesso nelle migration formali

C1, C2 e A3 **erano problemi reali**. Sono stati chiusi da un intervento manuale eseguito direttamente sul database — `DROP POLICY` sulle letture pubbliche di `orders` e `bookings`, `CREATE POLICY` per le `tenant storage: owner *` — prima che questo audit avesse visibilità sul progetto. La prima revisione li ha classificati come infondati perché non ne trovava traccia; era la conclusione sbagliata da un'osservazione giusta.

> **Il punto di metodo.** L'assenza di un intervento dalla cronologia delle migration non prova l'assenza originaria del problema: prova solo l'assenza di un record formale dell'intervento. Sono due affermazioni diverse, e la prima revisione le ha scambiate.
>
> Quanto è stato possibile verificare, e cosa no:
>
> | Fonte | Esito |
> |---|---|
> | `git log -S "orders: public read"` / `"bookings: public read"` | solo le migration 007/014 e la loro neutralizzazione |
> | `git log -S "tenant storage"` | solo `ff609ac`, il commit dell'audit stesso |
> | `query.csv` — dump del catalogo, commit `ff609ac` del 22 set 2026 17:13 | letture pubbliche **assenti**, `tenant storage: owner insert/update/delete` **presenti** |
> | `scripts/logs/` | due soli file, migrazione storage del 22 set 14:33 e 14:36, nessun riferimento a policy |
>
> Il dump è una **fotografia dello stato**, non una cronologia: mostra com'era il database in quel momento, e non può distinguere "policy mai esistita" da "policy rimossa prima dello scatto". La riclassificazione poggia quindi sulla ricostruzione di chi ha eseguito l'intervento, non su una prova recuperabile dagli artefatti del progetto. È precisamente la situazione che rende necessario il versionamento dello schema.

### ✅◆ C1 — `orders` e `order_items` leggibili da chiunque

**Il problema.** Una policy `FOR SELECT USING (true)` su entrambe le tabelle — la stessa che la migration `007_public_order_read.sql` descrive — esponeva `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `notes` e `total` di tutti i clienti di tutti i ristoranti a chiunque possedesse la chiave anon, che è pubblica per costruzione.

**Come è stato chiuso.** `DROP POLICY` diretto sul database. Al momento della ricognizione `orders` ha quattro policy (`owner read`, `owner update`, `public insert`, `public update expired`) e nessuna lettura pubblica. Sonda con chiave anon: 7 ordini reali in tabella, **0 righe restituite**; idem per `order_items`, 8 righe reali e 0 restituite.

La migration 007 è stata neutralizzata perché, essendo rimasta nella sequenza, avrebbe ricreato la policy su ogni ambiente nuovo.

### ✅◆ C2 — `bookings` leggibili da chiunque

Stessa dinamica e stessa chiusura, con `014_public_booking_read.sql` come descrizione della policy rimossa. Al momento della ricognizione `bookings` ha solo `owner all` e `public insert`. Anche la 014 è stata neutralizzata.

### ✅◆ A3 — Storage senza separazione per tenant

**Il problema.** Le policy di storage concedevano INSERT/UPDATE/DELETE a qualunque utente autenticato su tutti i bucket, senza vincolo di percorso: un ristoratore poteva sovrascrivere o cancellare i file di un altro.

**Come è stato chiuso.** Sostituite da `tenant storage: owner insert/update/delete`, che verificano
`(storage.foldername(name))[1] = my_restaurant_id()::text OR is_admin()`.

Da leggere insieme a **N3**: quelle policy erano attive su un'applicazione che scriveva su path piatti, quindi *bloccavano* gli upload invece di limitarli. La separazione era corretta, il codice non vi si era adeguato.

---

## Rilievi smentiti

Sezione conservata deliberatamente: documenta un errore di metodo utile da ricordare.

> **⚠️ Le migration che descrivono le policy di C1 e C2 erano ancora nel repository.**
> Le policy sono state rimosse dal database (vedi la sezione precedente), ma i
> file 007 e 014 restavano nella sequenza: chiunque allestisse un ambiente nuovo
> eseguendola in ordine le avrebbe ricreate, riaprendo davvero le due falle.
> **Entrambi i file sono stati neutralizzati** (contenuto sostituito da
> `SELECT 1;` con la spiegazione in testa) e conservati solo per non alterare la
> numerazione.
>
> Il rischio è aggravato dal fatto che `anon` possiede un `GRANT SELECT` di
> tabella su `orders`, `order_items` e `bookings`: non esiste alcuna
> restrizione per colonna che faccia da rete di sicurezza, quindi l'unica
> difesa è l'assenza di una policy permissiva. Lo si vede nella sezione
> `PRIVILEGI_anon` di `scripts/inspect-schema.sql`.

### ❌ C5 — "I miei ordini" espone lo storico altrui

Dipendeva interamente da C1. Senza lettura pubblica su `orders`, la funzione non restituisce nulla a un utente anonimo — **è anzi non funzionante**, il che è un difetto diverso e molto minore.

### ❌ A5 — `order_number` senza vincolo UNIQUE

In produzione esiste `UNIQUE (restaurant_id, order_number)`. Il difetto non sparisce, cambia natura e peggiora: vedere **N8**.

---

## Rilievi nuovi, emersi dalla verifica

### ✅ N1 — La vetrina pubblica era invisibile *(risolto, migration 015)*

**Cosa succedeva.** In produzione mancava la policy `restaurants: public read published` prevista dalla migration 002. Un visitatore anonimo riceveva **zero righe** da `restaurants` — con 1 ristorante pubblicato a sistema.

L'effetto era a cascata: le letture pubbliche di `menu_items`, `menu_categories`, `restaurant_hours`, `delivery_zones` e `promos` filtrano tutte con
`restaurant_id IN (SELECT id FROM restaurants WHERE status='published')`,
e quella sottoquery è a sua volta soggetta alle RLS di `restaurants`. Non vedendo alcun ristorante, l'anonimo non vedeva nemmeno menu, orari, zone e promozioni.

**Perché non se n'era accorto nessuno.** Il pannello del ristoratore opera da utente autenticato e continuava a funzionare normalmente. Il guasto era visibile solo da una finestra anonima.

**Risolto** dalla migration 015, che ricrea la singola policy mancante. Verificato: `/menu/convivium` torna a popolarsi.

### ✅ N2 — Ordini e prenotazioni fallivano senza essere salvati *(risolto)*

**Cosa succedeva.** Il checkout eseguiva `.insert(payload).select().single()`. In PostgreSQL un `INSERT … RETURNING` richiede anche una policy **SELECT** che copra la riga inserita; su `orders` le uniche SELECT sono `owner read` e `is_admin()`, entrambe false per un cliente anonimo.

**Verificato con una sonda** (ordine di prova inserito con chiave anon e rimosso subito dopo):

```
insert().select().single()          → [42501] new row violates row-level security policy
insert()  senza .select()           → OK
insert()  con id generato dal client → OK
```

L'intera istruzione veniva annullata: il cliente vedeva `Errore di rete` **e l'ordine non veniva salvato**, quindi il ristoratore non lo vedeva mai. Ordini persi senza lasciare traccia. Stessa dinamica per le prenotazioni, su entrambi i percorsi ("Solo Tavolo" e prenotazione con pre-ordine).

**Risolto** generando l'id lato client con `crypto.randomUUID()` e rimuovendo il `.select()`, in tutti e tre i punti di inserimento. Verificato in produzione dopo il deploy con un ordine e una prenotazione reali, completati dalla vetrina in sessione anonima e ricomparsi correttamente nel pannello del ristoratore.

### ✅ N3 — I path piatti bloccavano gli upload *(risolto)*

Le policy per tenant di N-A3 richiedono che il primo segmento del percorso sia il `restaurantId`. Per un oggetto nella radice del bucket `storage.foldername()` non restituisce alcun segmento, quindi la condizione era sempre falsa: **ogni upload su path piatto veniva rifiutato**, admin compreso.

**Ipotesi coerente con i dati, non dimostrata:** è la ragione per cui il bucket `dish-images` è vuoto e **159 `menu_items` su 159 non hanno immagine**. Logo e banner esistenti stanno su path piatti, quindi risalgono a prima che le policy per tenant fossero introdotte.

**Risolto**: gli upload di logo e banner scrivono ora sotto `<restaurantId>/` (le immagini piatto lo facevano già), e `scripts/migrate-storage-to-tenant-folders.js` ha spostato i 2 oggetti esistenti aggiornando i riferimenti in `restaurants`.

### ✅ N8 — Collisione di `order_number`: il secondo cliente del giorno non riesce a ordinare *(risolto)*

**Il problema.** `generateId()` costruiva il numero d'ordine da un contatore in `localStorage`, che riparte da `0001` su **ogni dispositivo**. In produzione esiste `UNIQUE (restaurant_id, order_number)`. Due clienti dello stesso ristorante, stesso giorno, browser diversi generavano entrambi `ORD-ggmm-0001`: il secondo INSERT violava il vincolo e falliva. Non era un caso limite, era il funzionamento normale a partire dal secondo ordine giornaliero.

**Risolto** spostando l'assegnazione del numero sul database, con la RPC `generate_order_number(p_restaurant_id, p_order_type, p_table_number)`. Commit `fe1c8b9` (prenotazioni) e `c6e9802` (checkout della vetrina), entrambi del 25 settembre 2026, che versionano lavoro svolto nella tornata precedente.

**Copertura verificata.** `generate_order_number` è richiamata in due soli punti, e sono i due che scrivono `order_number`:

| Punto | File:riga |
|---|---|
| Checkout della vetrina (`handleOrder`) | `src/app/menu/[slug]/page.tsx:2283` |
| Conversione prenotazione → ordine | `src/app/ristoratore/prenotazioni/page.tsx:199` |

Nessun altro punto del codice costruisce un `order_number`. `generateId()` sopravvive in `src/lib/id-generator.ts` ma **non è più richiamato da nessuna parte**: è codice morto, da rimuovere insieme al resto di B3.

**Sonda di concorrenza**, 12 checkout simultanei sullo stesso ristorante e nello stesso giorno, ciascuno da un client anonimo distinto — lo scenario esatto in cui il contatore in `localStorage` collideva:

```
numeri assegnati : ASP-2509-0003 … ASP-2509-0014
insert riusciti  : 12/12
numeri distinti  : 12 (nessun duplicato)
violazioni UNIQUE (23505): 0

secondo giro sequenziale : ASP-2509-0015, 0016, 0017  (la sequenza prosegue)
controprova: insert forzato con un numero già usato → 23505 respinto
```

La controprova serve a escludere la spiegazione alternativa più banale, cioè che le collisioni non si vedano perché il vincolo è sparito: è ancora attivo e respinge un duplicato inserito di proposito.

Resta possibile che due ristoranti diversi abbiano lo stesso numero, perché il vincolo è per ristorante. **A6, che dipendeva da questo, è comunque già chiuso** per una via diversa: il tracking non cerca più per `order_number` ma per UUID, univoco globalmente.

### ✅ N7 — PAT GitHub in chiaro *(rimosso e revocato)*

Il remote `origin` conteneva un Personal Access Token classico nell'URL, in chiaro in `.git/config`. Rimosso con `git remote set-url`; Git Credential Manager era già configurato, quindi l'autenticazione continua a funzionare.

Rimuoverlo dalla configurazione locale non lo invalidava: **il token è stato successivamente revocato e rigenerato**. Stessa sorte per la chiave Resend di A11, ora ruotata — resta leggibile nello storico Git, ma non è più valida.

### ✅ N9 — La pagina di tracking non ha mai mostrato nulla *(risolto)*

`OrderTrackingContent.tsx` interrogava `orders` direttamente con la chiave anon. RLS filtrava la riga e la query tornava `data: null` **con `error: null`**, indistinguibile da "ordine inesistente". Il codice trattava i due casi insieme (`if (error || !data) return`), quindi la pagina restava sullo scheletro vuoto — **con il primo step acceso**, come se l'ordine fosse stato confermato. Anche la subscription Realtime era inerte, perché dipendeva dall'id ricavato da quella fetch.

Sonda: ordine creato con chiave anon, poi riletto da una sessione anonima nuova → `data: null`, `error: null`, mentre la service role key conferma che la riga esiste.

**Risolto** spostando la lettura su `/api/order-status/[orderId]`, esteso per restituire tutti i campi che la pagina mostra (numero, tipo, indirizzo, articoli, totali, ristorante) e deliberatamente **nessun dato personale** — nome, email e telefono del cliente non compaiono nella risposta, perché l'endpoint è raggiungibile da chiunque conosca l'UUID.

Tre dettagli:

- Il parametro è ora l'**UUID**, non `order_number`: quest'ultimo è corto e sequenziale per ristorante, quindi enumerabile. Aggiornati i due punti che costruivano il link (schermata di conferma ed email di stato). Una validazione del formato UUID a monte risponde 400 ai vecchi link invece di far fallire la query su Postgres.
- Il **Realtime è stato sostituito da polling** sullo stesso endpoint, non adattato: anche i `postgres_changes` passano da RLS, quindi il canale si sottoscriveva senza mai ricevere un evento. Sarebbe stato lo stesso bug in forma diversa.
- Aggiunto uno **stato d'errore visibile** ("Ordine non trovato" / "Impossibile caricare l'ordine"). Prima il fallimento era completamente muto.

### ✅ N10 — La promo `first_order` era scavalcabile all'infinito *(risolto)*

`usePromoCode.ts` verificava l'idoneità al primo ordine contando gli ordini precedenti per email con una query anon su `orders`. RLS la filtrava: **`count: 0` con `error: null`**, sempre, per chiunque. Il ramo `countError` non scattava mai e la funzione cadeva direttamente su "nessun ordine precedente".

Sonda: ordine creato con quell'email, poi conteggio da sessione anonima nuova → `count: 0`, mentre la riga esiste.

**Risolto** con la RPC `count_customer_orders` (`SECURITY DEFINER`). Sul fallimento la promo viene ora **negata** anziché concessa: lasciarla passare avrebbe reso un guasto della RPC il nuovo modo di aggirare la verifica, cioè lo stesso difetto con un innesco diverso. Il guard copre anche il caso `error: null` con `data` non numerico, che non è un conteggio valido.

Verificato: email con ordini pregressi → `1`, promo bloccata; email nuova → `0`, promo concessa.

### ✅ N11 — Rollback di registrazione silenzioso *(risolto)*

In `/api/ristoratore/register` le cancellazioni di compensazione (`profiles.delete`, `auth.admin.deleteUser`) scartavano il valore di ritorno. Entrambe restituiscono `{ error }` senza lanciare, quindi un rollback fallito non lasciava alcuna traccia.

L'esito non è un semplice record orfano: resta un utente Auth registrato con l'email del ristorante mentre `owner_id` è ancora `NULL`. Dal pannello admin il locale sembra "non ancora attivato", ma ogni attivazione successiva muore su `createUser` con *"A user with this email address has already been registered"* — un messaggio che non ha rapporto con ciò che il ristoratore sta facendo, mentre il token resta valido e quindi riprovare sembra sensato. Riprodotto per intero con una sonda.

**Risolto** verificando ogni passo del rollback ed emettendo, in caso di fallimento, una riga `console.error` con tag `[register][ORPHAN_AUTH_USER]` contenente `userId`, email, `restaurantId`, causa a monte e quali cancellazioni sono fallite. Se la pulizia non riesce la risposta diventa 500 con un messaggio che indirizza all'amministratore, invece di invitare a riprovare — cosa che in quello stato non può funzionare.

Lo stesso tag viene emesso anche **al momento della scoperta**, quando `createUser` fallisce per email già presente e il ristorante ha ancora `owner_id` NULL: è il punto in cui il danno diventa visibile, e senza quella riga la causa non sarebbe ricostruibile da nessuna parte. Nessuna pulizia automatica: la rimozione resta manuale.

La diagnosi rilegge `owner_id` **due volte, a distanza di mezzo secondo**. Serve a distinguere l'orfano da una corsa fra due attivazioni simultanee sullo stesso link, dove il perdente vede "already registered" prima che il vincitore abbia scritto `owner_id`. Non è un'ipotesi: con la sola prima lettura, quattro richieste in parallelo producevano un falso positivo.

### ✅ N12 — `activation_token` esiste in produzione ma in nessuna migration *(risolto, migration 019)*

Le colonne `restaurants.activation_token` e `activation_token_expires_at` sono presenti sul database e su di esse poggia C4, ma **nessuna migration le crea**: non compaiono in alcun file del repository. È la stessa deriva descritta nella nota metodologica, in direzione "produzione più avanti delle migration".

Verificato: leggibili con la service role key, e `anon` riceve `permission denied for table restaurants` (effetto della 017). L'esposizione non c'è; il problema è che chi allestisse un ambiente nuovo dalla sequenza di migration si troverebbe la registrazione ristoratore non funzionante, senza una causa evidente.

**Risolto** dalla migration 019, che le versiona senza essere eseguita in produzione (dove esistono già). Ricostruita per introspezione, perché il testo del DDL originale non è recuperabile dal database: tipi e nullabilità dallo spec OpenAPI di PostgREST, nome dell'oggetto di unicità da una violazione provocata.

Una deduzione sbagliata lungo il percorso, corretta: il nome `restaurants_activation_token_key` è quello che PostgreSQL genera da sé per un vincolo `UNIQUE` di colonna, e la prima stesura lo trattava come tale. Eseguendo la migration si è visto che `pg_constraint` non contiene nulla con quel nome, mentre `ADD CONSTRAINT` viene rifiutata con `42P07 relation already exists`: il nome è occupato da un **indice univoco parziale**, non da un vincolo. Le due forme hanno comportamento identico — un `UNIQUE` semplice ammette già più NULL — quindi nessuna sonda le distingue; è stato il tentativo di crearlo a rivelarlo.

### ⚠️ N13 — Stesso pattern, punti ancora aperti

N9, N10, A7 e A8 condividono una sola causa: **un risultato vuoto prodotto da RLS (`data: null`, `count: 0`, `[]`, sempre con `error: null`) trattato come stato legittimo** anziché come possibile blocco di permessi. PostgREST non distingue i due casi, e nessuno dei blocchi `catch` scatta.

Una ricognizione mirata sui contesti anonimi (`src/app/menu/`, `src/app/ordine/`, hook delle pagine pubbliche) ha trovato altri quattro punti. I percorsi in `src/app/admin/` e `src/app/ristoratore/` sono esclusi: girano con sessione autenticata e policy owner corrispondenti.

| # | Punto | Cosa assume | Perché è lo stesso pattern |
|---|---|---|---|
| a | `menu/[slug]/page.tsx` — `loadHistoryOrders` | modale "I miei ordini": SELECT anon su `orders` per `customer_email` | Identico a N10. `data` è `[]` con `error: null`, il `catch` non scatta mai, l'utente legge "nessun ordine" invece di "non posso mostrarteli". Verosimilmente **già morto in produzione** — è il residuo di C5 |
| b | `menu/[slug]/page.tsx` — canale Realtime anon su `orders`/`bookings` | che i `postgres_changes` arrivino | Passano da RLS: il canale si sottoscrive senza mai consegnare un evento. Oggi mascherato dal polling su `/api/order-status`, che fa tutto il lavoro |
| c | `usePromoCode.ts` — `SELECT id FROM restaurants` | `!restaurant` ⇒ "Ristorante non trovato" | Non rotto oggi (`restaurants` è leggibile da anon), ma il messaggio afferma l'inesistenza sulla base di un risultato vuoto: un futuro restringimento lo renderebbe fuorviante invece che rumoroso |
| d | `useRestaurantSettings.ts` — `maybeSingle()` su `restaurants` | `if (restaurant) {…}` senza ramo else | Come c. Il `throw error` copre solo l'errore esplicito; un vuoto da RLS cade nel nulla e la pagina resta sui `DEFAULT_SETTINGS` |

Il candidato più urgente è **a**, che è lo stesso difetto di N10 su una terza superficie. **Non affrontati** in questa sessione.

### ⚠️ N4 · N5 · N6 — Divergenze minori fra migration e produzione

- `loyalty_points` è creata dalla migration 001 ma **non esiste** in produzione.
- Esiste un bucket `menu-images` che nessuna migration crea e che nessun codice usa.
- Realtime è attivo su tutte e 11 le tabelle; la migration 005 ne prevedeva due (`orders`, `bookings`). Le RLS restano applicate anche via Realtime, quindi non è un'esposizione, ma è più ampio del previsto.

---

## Rilievi confermati — dettaglio

### ✅ C4 — Chiunque poteva rivendicare un ristorante non ancora attivato *(Critico, risolto)*

`/api/ristoratore/register` riceveva `restaurantId` ed `email` dal client e si limitava a verificare che coincidessero con la riga. Entrambi però non sono segreti: l'id compare nei link del pannello admin e nei link di attivazione già distribuiti, l'email è quella pubblica del locale. Chi li conosceva poteva creare l'account proprietario di qualsiasi ristorante con `owner_id` ancora NULL, scegliendo la propria password.

**Risolto** con un token monouso a scadenza:

- `send-activation-email` genera il token (7 giorni) e lo salva su `restaurants.activation_token` prima di comporre il link. Logica condivisa in `src/lib/activationToken.ts`.
- La route di registrazione accetta il **solo token** come identificatore. Il `restaurantId` è derivato server-side dalla riga che lo possiede, e l'email usata per creare l'utente è quella registrata sul ristorante — il valore inviato dal form non autorizza nulla e resta solo conferma visiva.
- Token mancante, scaduto, inesistente o già consumato ricevono **lo stesso identico messaggio**, per non confermare a un tentativo di enumerazione quale sia lo stato del token provato.
- L'invalidazione avviene nella **stessa UPDATE** che assegna `owner_id`, con filtri `activation_token` + `owner_id IS NULL` e `.select()` per distinguere "riga aggiornata" da "nessuna riga". È ciò che rende il consumo atomico.

Un effetto di perimetro: il token è generabile solo lato server, quindi i tre punti che costruivano il link nel browser (due pulsanti "Copia link" in `/admin/restaurants`, la schermata `PublishedSuccess`) avrebbero prodotto link morti. È stata aggiunta la route admin `/api/admin/activation-link`, che emette il link senza inviare email. **Ogni emissione ruota il token**, quindi copiare il link invalida quello già spedito per email: è corretto per un monouso, ma cambia l'abitudine operativa.

Verificato:

```
token scaduto / mai esistito / assente / già usato → 400, stesso messaggio
vecchio contratto (restaurantId + email)          → 400, owner_id resta NULL
token valido                                       → 200, owner_id assegnato, token e scadenza a NULL
3 attivazioni simultanee sullo stesso token        → [200,400,400]
activation_token con chiave anon                   → permission denied
route admin senza sessione                         → 401
```

Il quarto caso è quello che dimostra la chiusura: la coppia che prima bastava a rivendicare un locale ora non autorizza nulla.

Vedere **N11** per la gestione dei rollback parziali su questa stessa route, e **N12** per il fatto che le colonne su cui poggia non sono in alcuna migration.

### C6 — Nessun pagamento viene mai incassato *(Critico, aperto)*

Nessun SDK di pagamento fra le dipendenze, nessuna route API di pagamento, nessun endpoint webhook, nessuna verifica di firma, nessuna protezione da eventi duplicati. Confermato sullo schema reale: `orders` **non ha** né `payment_method` né `payment_status`.

In `handleOrder` la variabile `payMethod` non compare nel payload: il metodo scelto dal cliente finisce solo in `sessionStorage` e in "I miei ordini" viene riletto come `'cash'` scritto a mano. Il cliente sceglie "Carta di credito", vede "Elaborazione…", riceve la conferma; il ristoratore vede l'ordine in cucina. Nessuno dei due sa che non è stato addebitato nulla.

`docs/ROADMAP.md:91` registra "Integrazione Reale PayPal" come `[ ]` e la riga 82 annota che i metodi sono "attualmente mockati": la lacuna è nota. Quello che non è tracciato è che l'interfaccia la presenta all'utente finale come funzionante.

### C7 — Dati completi di carta raccolti in chiaro nel browser *(Critico, aperto)*

`CardPaymentForm.tsx` implementa a mano numero carta, scadenza e CVV con validazione Luhn locale, e i valori risalgono agli state `cardNumber`, `cardExpiry`, `cardCvv` del componente padre. È ciò che PCI-DSS vieta a un merchant senza certificazione SAQ-D: PAN e CVV devono stare in un iframe del gateway, non nel DOM dell'applicazione. Che i dati non vengano poi trasmessi non elimina il rischio, lo sposta: un'estensione del browser o uno script di terze parti li intercetterebbe.

*(TypeScript conferma il punto: `cardNumber`, `cardExpiry` e `cardCvv` risultano dichiarati e mai letti.)*

### C8 — Prezzi e totali decisi dal client *(Critico, aperto)*

`orders: public insert WITH CHECK (TRUE)` — confermata in produzione — consente di inserire una riga con qualsiasi contenuto. `subtotal`, `delivery_fee`, `discount`, `total` e il `price` di ogni articolo arrivano già calcolati dal browser, e nulla li ricalcola a partire da `menu_items.price`.

Sonda: un ordine con `total: 1` è stato inserito come utente anonimo senza alcuna obiezione. Anche `order_number`, `status` e `restaurant_id` sono scelti dal client, quindi è possibile inserire ordini falsi nel pannello di un concorrente o crearli già in stato `preparing`.

### C9 — Overbooking illimitato *(Critico, aperto)*

`tables_count` compare solo in `/ristoratore/tavoli` (QR code) e nel wizard admin, mai nel flusso di prenotazione. Non esiste `UNIQUE`, non esiste `EXCLUDE`, non esiste advisory lock, non esiste conteggio delle prenotazioni sullo slot, non esiste una tabella dei tavoli. Non è una race condition da chiudere: la verifica è assente, quindi il problema si manifesta anche con richieste sequenziali. `guests` è raccolto ma mai confrontato con una capienza.

### ✅ C3′ — Lettura pubblica di `restaurants` per riga intera *(Medio, risolto)*

Riformulazione di C3 alla luce dei fatti. La policy pubblica **non era presente** (da cui N1) ed è stata **reintrodotta dalla migration 015** perché senza di essa la vetrina non funziona. Le RLS filtrano righe e non colonne, quindi la riga è ora leggibile per intero.

Oggi l'esposizione concreta è limitata a `restaurants.email` (indirizzo personale del proprietario) e `owner_id`: `vat_number`, `online_payment_account`, `iban_holder`, `paypal_email` e `stripe_account_label` sono **tutti NULL**. Diventeranno pubblici nel momento in cui un ristoratore compilerà l'IBAN dalla pagina Pagamenti.

**Risolto** dalla migration 017 (`REVOKE` di tabella più `GRANT` delle sole colonne ammesse) insieme alla select esplicita in `useRestaurantSettings.ts`. Verificato in produzione con la chiave anon: la select della vetrina funziona, mentre `select('*')` e `select('online_payment_account')` restituiscono entrambe `permission denied`.

> **Nota su un errore da non ripetere.** La prima stesura della 017 usava solo una `REVOKE` per colonna. In PostgreSQL una revoca per-colonna non sottrae nulla a una concessione per-tabella, e Supabase assegna ad `anon` un `GRANT SELECT` sull'intera tabella: la migration è passata **senza errori e senza alcun effetto**. È il motivo per cui il file contiene ora una sezione di verifica esplicita — l'assenza di errori non è prova che una restrizione sia attiva.

### A2 · A4 · A9 · A10 · A13 · A15 — invariati

Confermati come nella prima stesura. In particolare, verificati sul DB:

- **A2** — `my_restaurant_id()` ha ancora `LIMIT 1` senza `ORDER BY`: la piattaforma supporta di fatto un solo ristorante per account.
- **A4** — `promos: public read active` è presente e consente di enumerare i codici sconto attivi di tutti i ristoranti pubblicati. Oggi latente: 0 promo a sistema.

*(A6, A8 e A12 sono stati chiusi e hanno una sezione propria qui sopra.)*

### ✅ A14 — Zero indici *(risolto)*

Indici non-PK/UNIQUE su tutto lo schema `public`: **0**. **Risolto dalla migration 016**, che ne crea 13 sui percorsi di accesso realmente usati dal codice. Riverificato in produzione: `A14 → 13`, tutti presenti.

### ✅ A7 — Lo stato `expired` non viene mai persistito *(risolto, migration 016 + 018)*

**Primo ostacolo, rimosso.** Il CHECK su `orders.status` ammetteva sette valori, senza `expired`, mentre `triggerExpired()` lo scrive: l'UPDATE violava il vincolo e l'errore finiva solo in `console.error`. La migration 016 ha esteso il CHECK — verificato: `A7 → SI`.

**Secondo ostacolo.** La scrittura continuava a non avere effetto. `triggerExpired()` eseguiva `update({status:'expired'}).eq('id', orderId)` come utente anonimo: il `WHERE` deve leggere la riga per individuarla, e questo richiede una policy **SELECT** che l'anonimo non possiede. L'UPDATE toccava **zero righe senza restituire alcun errore**.

Sonda su ordine di prova, con e senza `.select()` — la seconda forma serviva a distinguere "update rifiutato" da "sola lettura di ritorno negata":

```
UPDATE anon SENZA .select()   → HTTP 204, error null, stato reale: new
UPDATE anon CON  .select()    → data [],  error null, stato reale: new
UPDATE service_role           → OK, stato: expired
```

`data: []` con `error: null` dimostra che le righe aggiornate erano zero: non era la lettura di ritorno, era l'update stesso. Da notare che la policy `orders: public update expired` della migration 006 **è presente in produzione** — non arriva mai a essere valutata perché la riga non è individuabile.

**Risolto** dalla migration 018 con `expire_order(p_order_id uuid)`, `SECURITY DEFINER`, che aggiorna solo se lo stato è ancora `new` o `pending` e restituisce un boolean. La condizione replica quella della policy 006 e serve a non sovrascrivere un ordine che il ristoratore ha appena accettato — la corsa si verifica proprio allo scadere del timer. `triggerExpired()` passa ora dalla RPC e, se riceve `false`, **non dichiara la scadenza**: rilegge lo stato reale da `/api/order-status/[orderId]` e mostra quello.

Verificato:

```
ordine 'new'             → true,  stato reale: expired
ordine già 'preparing'   → false, stato reale: preparing (intatto)
seconda chiamata         → false
ordine inesistente       → false
```

Scelta di perimetro: per le prenotazioni la scadenza resta solo lato interfaccia. Il vecchio codice scriveva su `orders` usando l'id di una `booking` — un no-op garantito — quindi il ramo è stato reso esplicito senza cambiare il comportamento osservabile.

### ✅ A8 — `used_count` non incrementa, `max_uses` mai applicato *(risolto, migration 018)*

L'unica policy di scrittura su `promos` è `promos: owner write`: per l'anonimo l'UPDATE del checkout toccava zero righe senza errore, quindi il contatore restava a zero e il limite di utilizzi configurato dal ristoratore **non ha mai limitato nulla**.

**Risolto** con `increment_promo_usage(p_promo_id uuid)`, `SECURITY DEFINER`, che fa controllo e incremento **nello stesso UPDATE** (`WHERE max_uses IS NULL OR max_uses <= 0 OR used_count < max_uses`). Non è un dettaglio stilistico: leggere e riscrivere in due passaggi non reggerebbe a due checkout concorrenti sull'ultimo utilizzo disponibile, mentre in READ COMMITTED il secondo UPDATE si blocca sul lock di riga e alla ripresa rivaluta la `WHERE` sulla versione aggiornata.

Verificato:

```
max_uses=2 → true/1, true/2, false/2
5 checkout simultanei con max_uses=1 → [true,false,false,false,false], used_count=1
max_uses NULL → true    max_uses 0 → true    (nessun limite, come da codice applicativo)
UPDATE diretto anon su promos → data [] (resta bloccato)
```

Nel checkout il consumo è stato **spostato prima dell'insert dell'ordine**. Con l'ordine precedente la riga era già scritta con lo sconto applicato quando si scopriva il limite esaurito, e non restava nulla da non-applicare. Se la RPC torna `false`, il checkout si ferma, lo sconto viene azzerato e il cliente rivede il totale corretto.

**Effetto collaterale noto, non compensato:** se l'insert dell'ordine fallisce dopo l'incremento, quell'utilizzo resta consumato a vuoto. Perdere un'unità di `max_uses` in un caso raro è preferibile a regalare sconti illimitati, ma chiudere il cerchio richiederebbe una funzione di decremento.

### ✅ A6 — Tracking per `order_number` *(risolto)*

Il tracking cercava con `.eq('order_number', …).maybeSingle()`. Il difetto è chiuso alla radice: la ricerca avviene ora per **UUID**, che è univoco globalmente, quindi la collisione fra ristoranti non può più manifestarsi. Vedere N9 per il resto dell'intervento.

`order_number` resta visualizzato come riferimento leggibile per il cliente, ma non è più chiave di lookup in alcuna query o route. N8, la collisione in fase di INSERT, è stato chiuso separatamente spostando la numerazione su una sequenza di database.

### ✅ A12 — `/api/order/send-status-email` senza autenticazione *(risolto)*

La route usa la service role key e legge l'ordine completo per comporre il messaggio. Non verificava nulla: chiunque, senza sessione, poteva inviare email di "ordine accettato" o "ordine annullato" a nome di qualunque ristorante, per qualunque `orderId`.

**Risolto** applicando lo stesso schema di `/api/admin/send-activation-email`: `createServerClient` + `getUser()` → 401, controllo del ruolo su `profiles` → 403, esteso a `ristoratore | admin`. In più, per il ristoratore, l'ordine deve appartenere al proprio locale (`order.restaurants.owner_id === user.id`); l'admin non ha questo vincolo.

**Nessuna deroga per il contesto anonimo**, perché non esiste: l'unico chiamante è `updateOrderStatus` in `src/hooks/useOrders.ts`, nel pannello autenticato. L'email di conferma post-checkout non passa da questa route. Se un giorno la si aggiunge, va vincolata a un ordine creato da pochi minuti — annotato nel docstring.

Verificato: POST anonimo → 401 su entrambi gli stati; POST con cookie di sessione falsi → 401.

---

## Collegamenti mancanti e funzionalità incomplete

### Codice definito e mai richiamato

| Modulo | Stato |
|---|---|
| `src/services/restaurants.ts` | `getAll()`, `getBySlug()`, `create()` restituiscono tutti `[]` o `null`. Mai importato. |
| `src/lib/formatters.ts` | `formatPrice` corretto e funzionante, mai importato: ~80 `.toFixed(2)` a mano. |
| `src/lib/supabase-server.ts` | Mai usato: le route API ricreano il client inline, cinque volte. |
| `src/components/ristoratore/RevenueChart.tsx` | 115 righe, mai montato. |
| `src/components/ui/AppVersion.tsx` | Mai montato, benché `version.json` sia aggiornato a ogni build. |
| `restaurant-utils.ts` → `getRestaurantId()` | Restituisce lo slug immutato; `isMockRestaurant()` sempre `false`. |

### Funzionalità con interfaccia ma senza sostanza

- **`/admin/sicurezza`** — `mockLogs` è un array vuoto, `handleExport()` mostra un alert e non esporta nulla, non esiste tabella `audit_logs`. La pagina è raggiungibile dalla sidebar come funzionalità a tutti gli effetti.
- **Pagamenti online** — vedi C6, C7, A9.
- **Gestione tavoli** — genera QR code, ma i tavoli non sono entità: niente capienza, niente stato, nessun legame con le prenotazioni.
- **Ruolo `cliente`** — dichiarato nel tipo `Role`, ma il CHECK su `profiles.role` ammette solo `admin` e `ristoratore`. Non esiste autenticazione per il cliente finale.

### Documentazione divergente

`docs/supabase_schema.md` descrive tabelle inesistenti (`promo_codes`, `menu_item_options`, `audit_logs`), colonne inesistenti (`orders.payment_status`, `profiles.restaurant_id`), enum diversi e una ventina di indici mai creati. `docs/TECHNICAL_SPECIFICATIONS.md` cita "Next.js 14+" e una cartella `src/app/superadmin/` che non esiste.

La cartella `docs/` è esclusa dal versionamento per scelta: è materiale privato, e il costo consapevole è che la divergenza non emerge in review.

---

## Cosa manca per considerare il gestionale davvero completo

### ✅ Blocco 0 — Ripristino del servizio *(completato in questa sessione)*

- [x] Ripristinata la lettura pubblica della vetrina (mig. 015)
- [x] Corretto il checkout: ordini e prenotazioni tornano a salvarsi
- [x] Lettura pubblica di `restaurants` ristretta alle sole colonne della vetrina (mig. 017)
- [x] Upload storage allineati alle policy per tenant, oggetti esistenti migrati
- [x] 13 indici creati sui percorsi di accesso reali (mig. 016)
- [x] `expired` ammesso dal CHECK (mig. 016) — ma la scrittura resta inefficace, vedi A7
- [x] Schema Supabase riportato sotto versionamento
- [x] PAT GitHub rimosso dalla configurazione locale

### Blocco 1 — Chiudere le esposizioni residue

- [x] PAT GitHub revocato e rigenerato
- [x] Chiave Resend revocata e ruotata *(resta nello storico Git, ma non è più valida)*
- [x] Autenticare `/api/ristoratore/register` con un token monouso a scadenza (C4)
- [ ] Portare il ruolo utente fuori dal cookie client-side
- [x] Autenticare `/api/order/send-status-email` (A12)
- [ ] Rate limit sugli endpoint pubblici *(resta aperto: nessun endpoint ne ha)*
- [x] Neutralizzate le migration 007 e 014, che avrebbero reintrodotto C1 e C2 su ogni ambiente nuovo
- [ ] Riconciliare le restanti migration 001-013 con lo schema reale e correggerle
- [ ] Aggiungere la migration mancante per `activation_token`/`activation_token_expires_at` (N12)
- [ ] Valutare una restrizione per colonna anche su `orders` e `bookings`: oggi `anon` ha un `GRANT SELECT` di tabella e l'unica difesa è l'assenza di policy permissive

### Blocco 2 — Integrità dei dati d'ordine

- [ ] Ricalcolare importi e prezzi **lato server** a partire da `menu_items.price`, ignorando quanto inviato dal client
- [x] Generare `order_number` lato database con una sequenza per ristorante (N8; A6 è chiuso a parte, dal passaggio del tracking a UUID)
- [x] Spostare lato server la scadenza degli ordini (A7, mig. 018)
- [ ] Unificare il vocabolario degli stati fra CHECK, Kanban, tracking ed email
- [x] Incrementare `promos.used_count` in modo atomico e far rispettare `max_uses` (A8, mig. 018)
- [ ] Compensare l'incremento di `used_count` se l'insert dell'ordine fallisce subito dopo (A8, effetto residuo)
- [ ] Sostituire il delete-and-reinsert del menu con un upsert per chiave stabile

### Blocco 3 — Pagamenti *(il blocco più grande, oggi interamente assente)*

- [ ] Scegliere il modello: Connect/Partner con il ristoratore merchant, o incasso centralizzato con payout
- [ ] Onboarding OAuth reale: `stripe_connected` deve derivare da una connessione verificata
- [ ] Sostituire `CardPaymentForm` con Stripe Elements o equivalente ospitato dal gateway
- [ ] Aggiungere `payment_method`, `payment_status`, `payment_intent_id`, `paid_amount`, `refunded_amount`
- [ ] Webhook con verifica della firma e tabella degli eventi processati (idempotenza)
- [ ] Definire la macchina a stati ordine↔pagamento e i casi di fallimento
- [ ] Implementare i rimborsi e allineare il testo dell'email che oggi li promette

### Blocco 4 — Prenotazioni degne di un gestionale

- [ ] Modellare i tavoli come entità (numero, capienza, sala)
- [ ] Durata del turno e calcolo della disponibilità reale per slot
- [ ] Impedire l'overbooking **a livello di database**, non solo nell'interfaccia
- [ ] Fuso orario per ristorante; smettere di dedurre l'ora dal browser del cliente
- [ ] Escludere gli slot già passati nella giornata corrente
- [ ] No-show, modifiche last-minute, overbooking intenzionale configurabile
- [ ] Conferma al cliente via email o SMS

### Blocco 5 — Completare ciò che è abbozzato

- [ ] `audit_logs` reale e `/admin/sicurezza` collegata
- [ ] Decidere il destino di `loyalty_points` (oggi nemmeno creata in produzione)
- [ ] Incrementare `orders_count` o rimuovere la statistica
- [ ] Autenticazione del cliente finale (magic link)
- [ ] Decidere se supportare più ristoranti per proprietario; in tal caso rifare `my_restaurant_id()` e l'`AuthContext`
- [ ] Rimuovere il bucket orfano `menu-images`; allineare Realtime alle tabelle che servono

### Blocco 6 — Robustezza e qualità

- [ ] Disattivare `ignoreBuildErrors` e `ignoreDuringBuilds`, sanare quanto emerge
- [ ] Sostituire i 108 `catch` muti con stati d'errore visibili
- [ ] Sostituire i 25 `alert()` e gli 11 `confirm()` nativi
- [ ] Introdurre una suite di test: oggi non ne esiste alcuna, e **nessuno dei guasti trovati in questa sessione sarebbe stato intercettato automaticamente**
- [ ] Paginare le query non limitate
- [ ] Rimuovere il codice morto

---

## Lezione di metodo

Il guasto più grave — vetrina e checkout non funzionanti per i clienti — **non era individuabile leggendo il codice**, perché il codice era corretto rispetto alle migration. Era la produzione a essere diversa. Allo stesso tempo, i tre rilievi Critici poi smentiti derivavano dall'aver trattato le migration come descrizione affidabile del database.

Entrambi gli errori hanno la stessa radice: nessuna fonte di verità sullo schema. Tenerlo versionato e riconciliato non è ordine formale — è la precondizione perché qualunque ragionamento sulla sicurezza di questo sistema sia attendibile.

`scripts/inspect-schema.sql` è in repo proprio per questo: rieseguirlo periodicamente e confrontarlo con le migration è il modo più economico per accorgersi in tempo della prossima deriva. N12 mostra che la deriva continua: due colonne su cui poggia il flusso di attivazione esistono in produzione e in nessuna migration.

**Corollario dalla sessione del 25 settembre.** Leggere il codice non basta a stabilire se una scrittura abbia effetto. Tre dei rilievi chiusi presentavano codice apparentemente corretto — l'`await` c'era, il `catch` c'era, l'`error` veniva controllato — e non facevano nulla. Solo una sonda che esegue l'operazione e poi **rilegge lo stato con un'identità diversa** lo rende visibile. Da qui la forma usata in tutte le verifiche di questa sessione: agire con la chiave anon, rileggere con la service role key, confrontare.

Vale anche in senso inverso: la stessa disciplina ha smentito una mia conclusione. Avevo dedotto dall'UPDATE a zero righe che la policy `orders: public update expired` non fosse attiva; l'ispezione del catalogo registrata in C1 la elenca invece fra le policy presenti. La causa era un'altra — la mancanza di una policy SELECT che rendesse la riga individuabile — e il commento della migration 018 è stato corretto di conseguenza. Un'inferenza da sintomo non sostituisce una verifica diretta, nemmeno quando il sintomo è reale.
