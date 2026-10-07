# AUDIT REPORT — iGOdelivering (partito da v1.29.2, aggiornato a v1.37.0)

**Commit di partenza dell'audit:** `c144d72` (v1.29.2, 10 settembre 2026, branch `main`)
**Prima stesura:** 22 settembre 2026 — analisi statica del codice
**Revisione:** 22 settembre 2026 — verifica contro il database di produzione
**Seconda tornata:** 25 settembre 2026 — chiusura di A6, A7, A8, A12, C4, N8, N9, N10, N11, N12; nuovo rilievo N13; riclassificazione di C1, C2, A3 (25 set) e di C3 (26 set)
**Fase pagamenti:** 2–7 ottobre 2026 — chiusura di C6, C7, A9, A10 (Stripe Connect, migration 028–035); nuovi rilievi N19–N23
**Ultimo aggiornamento:** 7 ottobre 2026 — regola unica di accettazione per ordini e prenotazioni (migration 034); rilievi N19–N23; riesame degli aperti contro il codice
**Perimetro:** 39.443 righe TypeScript/TSX in `src/` (100% dei file), 19 migration SQL, configurazione Next.js, documentazione, storico Git.

> **Stato del codice.** Tutti gli interventi descritti come risolti sono
> committati su `main` (verificabile con `git log`): la prima tornata in
> `ff609ac` (22 settembre), la seconda in nove commit da `6d044c3` a `819190d`
> (25 settembre), poi dalla fase pagamenti (2–7 ottobre, release 1.31.0–1.37.0).
> Sul database di produzione sono applicate le migration 015–018 e 020–034; la
> **035 e la 036 sono scritte e da applicare** (vedi N23 e M3). La 019 versiona colonne che in
> produzione esistono già e non va eseguita.

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

## Legenda degli stati (al 7 ottobre 2026)

| | |
|---|---|
| ✅ **Risolto** | intervento applicato in produzione e verificato |
| ✅◆ **Risolto fuori migration** | chiuso da un intervento manuale diretto sul database, privo di un record formale nella sequenza di migration |
| ✅ **Rimosso e revocato** | segreto rimosso dalla configurazione in cui era esposto e invalidato presso il provider (N7) |
| ✅ **Ruotata** | segreto invalidato e sostituito; resta leggibile nello storico Git, ma non è più valido (A11) |
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
| **N17** | Auth | Registrazione pubblica aperta + `profiles: self insert` senza vincolo di ruolo: chiunque può diventare admin | **Critico** | ✅ Risolto (mig. 023 + registrazione disattivata) | prod |
| **N18** | Auth | `activation_token` e colonne sensibili di `restaurants` leggibili da qualunque utente autenticato | **Alto** | ✅ Risolto (mig. 024–027) | prod |
| **N13** | Qualità | Altri 4 punti trattano un risultato vuoto da RLS come "non esiste" | Medio | ⚠️ Aperto (a risolto il 30 set) | codice |
| **N14** | Schema | `generate_order_number`, `count_customer_orders` e la tabella `order_number_counters` esistono in produzione ma in nessuna migration | Medio | ⚠️ Aperto | prod |
| **N15** | Dati | L'unica zona di consegna di convivium ha l'elenco CAP vuoto: nessun ordine a domicilio è completabile | **Alto** | ✅ Risolto | prod |
| **N16** | Ordini | Orari e sospensione del servizio applicati solo dalla vetrina, non da `/api/orders` | Medio | ✅ Risolto | prod |
| C4 | Auth | `/api/ristoratore/register` autorizzava con `restaurantId` + email, entrambi noti | **Critico** | ✅ Risolto | prod |
| C6 | Pagamenti | Nessun gateway: l'ordine è creato senza alcun addebito | **Critico** | ✅ Risolto (Stripe Connect, mig. 028–035; da provare in modalità live) | codice |
| C7 | Pagamenti | PAN + CVV raccolti in chiaro in un form custom (PCI-DSS) | **Critico** | ✅ Risolto (modulo rimosso) | codice |
| C8 | Pagamenti | Prezzi, sconto e totale calcolati dal client e inseriti senza validazione | **Critico** | ✅ Risolto (mig. 020) | prod |
| C9 | Prenotazioni | Nessun controllo di capienza: overbooking illimitato | **Critico** | ✅ Risolto (mig. 022) | prod |
| A1 | Auth | Ruolo letto da cookie non-httpOnly scritto dal client | **Alto** | ✅ Risolto | prod |
| A2 | Multi-tenant | `my_restaurant_id()` usa `LIMIT 1`: un owner con più locali ne governa uno solo | **Alto** | ⚠️ Aperto | prod |
| A4 | Multi-tenant | Codici sconto attivi enumerabili in anonimo (oggi 0 promo a sistema) | **Alto** | ⚠️ Aperto | prod |
| A6 | Ordini | Tracking per `order_number` con `maybeSingle()`: rotto su collisione fra ristoranti | **Alto** | ✅ Risolto | prod |
| A7 | Ordini | Lo stato `expired` non viene mai persistito | **Alto** | ✅ Risolto (mig. 016 + 018; scadenza lato server, mig. 034) | prod |
| A8 | Promozioni | `used_count` non incrementa: `max_uses` mai applicato | **Alto** | ✅ Risolto (mig. 018) | prod |
| A9 | Pagamenti | `stripe_connected`/`paypal_connected` auto-dichiarati | **Alto** | ✅ Risolto (mig. 028–029 + collegamento Stripe reale) | prod |
| A10 | Pagamenti | Nessun flusso di rimborso, ma l'email di annullamento lo promette | **Alto** | ✅ Risolto (`/api/order/cancel`, mig. 030 + 032) | codice |
| A11 | Segreti | Chiave API Resend reale nello storico Git | **Alto** | ✅ Ruotata | codice |
| A12 | Auth | `/api/order/send-status-email` senza autenticazione | **Alto** | ✅ Risolto | prod |
| A13 | Prenotazioni | Nessuna gestione fusi orari | **Alto** | ⚠️ Aperto — ordini e scadenze ora usano l'ora di Roma lato server; gli slot delle prenotazioni no | codice |
| A14 | Performance | Zero indici sul database | **Alto** | ✅ Risolto (mig. 016) | prod |
| A15 | Dati | Il wizard cancella e reinserisce tutto il menu ad ogni salvataggio | **Alto** | ⚠️ Aperto | codice |
| C3′ | Multi-tenant | `restaurants` pubblica espone email proprietario e (futuri) dati bancari | Medio | ✅ Risolto (mig. 017) | prod |
| M1 | Multi-tenant | `platform_settings` leggibile da chiunque (oggi vuota) | Medio | ⚠️ Aperto | prod |
| M2 | Multi-tenant | Nessuna UPDATE self su `profiles`; nessuna UPDATE/DELETE su `order_items` | Medio | ⚠️ Aperto | prod |
| M3 | Prenotazioni | Slot già passati prenotabili per la giornata corrente (e giorni passati) | **Alto** | ✅ Risolto (8 ott: vetrina + `/api/bookings` + mig. 036, **da applicare**) | codice |
| M4 | Prenotazioni | Creazione pubblica di ordini e prenotazioni senza rate limit | Medio | ✅ Risolto (mig. 021) | prod |
| M5 | Qualità | `ignoreBuildErrors` + `ignoreDuringBuilds` attivi | Medio | ⚠️ Aperto | codice |
| M6 | Qualità | 108 blocchi `catch` su 133 si limitano a `console.error` | Medio | ⚠️ Aperto | codice |
| M7 | Performance | Dashboard admin: `select('*')` su tutti gli ordini senza limite | Medio | ⚠️ Aperto | codice |
| M8 | Feature | `/admin/sicurezza` è un guscio vuoto | Medio | ⚠️ Aperto | codice |
| M9 | Dati | `published_at` non valorizzato dal wizard di creazione | Medio | ⚠️ Aperto (la configurazione e l'elenco lo scrivono; il wizard "nuovo" no) | codice |
| **N4** | Dati | `loyalty_points` non esiste in produzione (è solo nella migration 001) | Basso | ⚠️ Aperto | prod |
| **N5** | Storage | Bucket `menu-images` in produzione, assente da migration e codice | Basso | ⚠️ Aperto | prod |
| **N6** | Dati | Realtime attivo su tutte e 11 le tabelle (la 005 ne prevedeva 2) | Basso | ⚠️ Aperto | prod |
| B2 | Dati | `orders_count` letto ma mai incrementato: sempre 0 | Basso | ⚠️ Aperto (riverificato 7 ott) | codice |
| B3 | Codice | Moduli morti (`services/restaurants.ts`, `lib/formatters.ts`, `lib/id-generator.ts`, …) | Basso | ⚠️ Aperto | codice |
| B4 | Docs | `docs/supabase_schema.md` descrive uno schema inesistente | Basso | ⚠️ Aperto | codice |
| C1 | Multi-tenant | `orders`/`order_items` leggibili da chiunque | **Critico** | ✅◆ Risolto fuori migration | prod |
| C2 | Multi-tenant | `bookings` leggibili da chiunque | **Critico** | ✅◆ Risolto fuori migration | prod |
| A3 | Storage | Storage senza separazione per tenant | **Alto** | ✅◆ Risolto fuori migration | prod |
| ~~C5~~ | ~~Privacy~~ | ~~"I miei ordini" espone lo storico altrui~~ | — | ❌ Smentito | prod |
| ~~A5~~ | ~~Ordini~~ | ~~`order_number` senza UNIQUE~~ | — | ❌ Smentito → vedi N8 | prod |
| **N8** | Ordini | Collisione `order_number` → INSERT rifiutato: il 2° cliente del giorno non ordina | **Alto** | ✅ Risolto | prod |
| **N19** | Ordini | Il timer di 3 minuti non scattava per nessun ordine con orario scelto (cioè tutti): nessuna scadenza per contanti e POS, nessun timer al cliente | **Alto** | ✅ Risolto (mig. 034) | codice |
| **N20** | Pannello | Dettaglio e stampa del pannello cucina non mostravano piatti né personalizzazioni (campi inesistenti) | **Alto** | ✅ Risolto | codice |
| **N21** | Ordini | Ricevuta con supplementi sommati due volte; supplementi senza prezzo in ricevuta, riepilogo, tracking ed email (`[object Object]`) | Medio | ✅ Risolto | codice |
| **N22** | Admin | "Pubblica Ristorante" nella configurazione salvava il locale lasciandolo in bozza | Medio | ✅ Risolto | codice |
| **N23** | Pagamenti | Un ordine online scaduto o annullato (carta non addebitata) poteva essere portato in preparazione dal browser | Medio | ✅ Risolto (mig. 035, **da applicare**) | codice |
| **N24** | Vetrina | Dopo "Prenota e ordina" il pulsante "Prenota tavolo" spariva fino a un ricaricamento | Medio | ✅ Risolto | codice |

---

## Executive summary

Il progetto è funzionalmente ricco e l'interfaccia è completa. Al momento dell'audit, però, **la piattaforma era inutilizzabile dai clienti finali**: la vetrina pubblica non mostrava nulla a chi non era autenticato, e ordini e prenotazioni fallivano senza essere salvati. Entrambi i problemi erano invisibili dal pannello del ristoratore, che continuava a funzionare perché opera da utente autenticato. Sono stati individuati e corretti nella prima tornata di lavoro (22–23 settembre 2026).

Chiusi quelli, restavano tre lacune strutturali. La seconda è chiusa dal 30 settembre 2026:

1. ~~**Non esiste alcuna integrazione di pagamento.**~~ *Risolto (C6, C7, A9, A10).* Niente Stripe, niente PayPal, nessun webhook, nessuna colonna `payment_status`, e un checkout che raccoglieva PAN e CVV in chiaro e li scartava. Dal 2 al 7 ottobre 2026 c'è Stripe Connect: ogni ristorante incassa sul proprio account, il pagamento è prima autorizzato e poi incassato all'accettazione dell'ordine.
2. ~~**Gli importi sono decisi dal client.**~~ *Risolto (C8).* `subtotal`, `discount`, `total` e il prezzo di ogni articolo arrivavano dal browser e nessuna funzione server li ricalcolava: anche con un gateway si sarebbe addebitata la cifra scelta dal cliente. Ora li calcola `/api/orders` dai dati del database.
3. **Le prenotazioni non hanno alcun controllo di capienza.** `tables_count` serve solo a generare i QR code. Nessun vincolo, nessun lock, nessun conteggio: l'overbooking è illimitato.

**Aggiornamento del 25 settembre.** Una seconda tornata ha chiuso i rilievi che dipendevano dal silenzio di RLS sulle operazioni lato client (A7, A8, N9, N10) e due sull'autenticazione delle route (C4, A12). Il filo conduttore dei primi quattro merita di essere isolato, perché è una classe di difetto e non quattro incidenti: **PostgreSQL non distingue "non esiste" da "non ti è permesso vederlo"**, e PostgREST restituisce in entrambi i casi un risultato vuoto con `error: null`. Ogni punto in cui il codice legge o scrive `orders`, `bookings` o `promos` con la chiave anon e interpreta il vuoto come stato legittimo è un guasto silenzioso in attesa. Quattro punti residui sono censiti in N13.

Il rimedio adottato è sempre lo stesso: spostare l'operazione dietro una funzione `SECURITY DEFINER` o una route con service role key, e farle restituire un esito esplicito — un boolean, un conteggio, un 404 — che il chiamante non possa confondere con un risultato vuoto.

**Aggiornamento del 7 ottobre.** La fase pagamenti ha chiuso C6, C7, A9 e A10 e ha fatto emergere cinque difetti che i soli pagamenti non spiegavano (N19–N23). Il più istruttivo è N19: il timer di 3 minuti era implementato e non scattava per **nessun** ordine, perché l'opzione "il prima possibile" è disattivata nel checkout e quindi ogni ordine porta un orario scelto, che il codice trattava come "programmato, senza scadenza". Era un guasto silenzioso della stessa famiglia di A7: il codice faceva ciò che era scritto, e ciò che era scritto non corrispondeva a ciò che si voleva. Ora la regola è una sola e la decide il server (vedi N19).

L'isolamento multi-tenant, che la prima stesura indicava come area critica, **oggi in produzione regge**: le policy per proprietario sono corrette, le API admin verificano il ruolo server-side prima di usare la service role key, e le letture pubbliche indiscriminate su `orders`, `order_items` e `bookings` (C1, C2) — problemi reali, non ipotizzati — erano già state rimosse con un intervento manuale prima che l'audit avesse visibilità sul progetto. Il problema reale non è che le RLS siano permissive — è che **nessuno sa con certezza quali siano**, perché lo schema non era versionato e le migration non corrispondono alla produzione.

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
> | Sonda N2 con chiave anon, 22 set 2026 (precede il fix in `ff609ac`) | `orders`: `insert().select().single()` → **`42501`** new row violates row-level security policy |
>
> La sonda di N2 è un'evidenza **comportamentale e indipendente dal dump**: un `INSERT … RETURNING` richiede che una policy SELECT copra la riga inserita, quindi se `orders: public read` (`FOR SELECT USING (true)`) fosse stata attiva l'istruzione sarebbe riuscita. Il `42501` conferma per via diversa che quel giorno su `orders` non c'era alcuna lettura pubblica. Vale per `orders`, l'unica tabella di cui N2 riporta l'output: per `bookings` N2 descrive la stessa dinamica senza riportarne l'esito, e `order_items` non è stata sondata in questa forma.
>
> Sia il dump sia la sonda sono però **fotografie dello stato**, non una cronologia: mostrano com'era il database in quel momento, e non possono distinguere "policy mai esistita" da "policy rimossa prima dello scatto". La riclassificazione poggia quindi sulla ricostruzione di chi ha eseguito l'intervento, non su una prova recuperabile dagli artefatti del progetto. È precisamente la situazione che rende necessario il versionamento dello schema.

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

Le policy per tenant di A3 richiedono che il primo segmento del percorso sia il `restaurantId`. Per un oggetto nella radice del bucket `storage.foldername()` non restituisce alcun segmento, quindi la condizione era sempre falsa: **ogni upload su path piatto veniva rifiutato**, admin compreso.

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

**Risolto** dalla migration 019, che le versiona senza essere eseguita in produzione (dove esistono già). Ricostruita per introspezione, perché il testo del DDL originale non è recuperabile dal database: tipi e nullabilità dallo spec OpenAPI di PostgREST, nome dell'oggetto di unicità da una violazione provocata, definizione dell'indice da `pg_indexes`.

Una deduzione sbagliata lungo il percorso, corretta: il nome `restaurants_activation_token_key` è quello che PostgreSQL genera da sé per un vincolo `UNIQUE` di colonna, e la prima stesura lo trattava come tale. Eseguendo la migration si è visto che `pg_constraint` non contiene nulla con quel nome, mentre `ADD CONSTRAINT` viene rifiutata con `42P07 relation already exists`: il nome è occupato da un **indice univoco**, non da un vincolo. È stato il tentativo di crearlo a rivelarlo.

Quel `42P07` non stabiliva però se l'indice fosse parziale o pieno, e la prima versione di questa sezione lo dava per parziale senza averlo verificato. Le due forme hanno comportamento identico — un `UNIQUE` pieno ammette già più NULL — quindi nessuna sonda le distingue. La definizione è stata letta dal catalogo il 30 settembre 2026:

```
SELECT indexdef FROM pg_indexes WHERE indexname = 'restaurants_activation_token_key';
→ CREATE UNIQUE INDEX restaurants_activation_token_key ON public.restaurants
    USING btree (activation_token) WHERE (activation_token IS NOT NULL)
```

L'indice è **parziale**, e la migration 019 lo riproduce testualmente.

### ✅ N17 — Chiunque poteva registrarsi e promuoversi admin *(Critico, risolto)*

Emerso il 2 ottobre 2026 lavorando su A1. Tre condizioni insieme:

- la registrazione pubblica di Supabase è attiva (`disable_signup: false`) e la conferma email è automatica (`mailer_autoconfirm: true`), quindi con la chiave anon — pubblica per costruzione — chiunque ottiene una sessione autenticata;
- la policy `profiles: self insert` ammette `INSERT` con `CHECK (id = auth.uid())`, senza alcun vincolo sul ruolo;
- il vincolo di tabella su `profiles.role` ammette `'admin'`.

Un estraneo poteva quindi registrarsi, inserire il proprio profilo con `role = 'admin'` e ottenere `is_admin() = true`: lettura e scrittura su ordini, clienti, prenotazioni, ristoranti e utenti di tutta la piattaforma.

**Non sfruttato:** al 2 ottobre esistono 3 utenti Auth e 3 profili — un solo admin (`admin@igodelivering.it`, giugno 2026) e due ristoratori — e nessun utente senza profilo. La catena non è stata eseguita come sonda, per non creare un admin in produzione nemmeno temporaneamente: le tre condizioni sono verificate singolarmente (impostazioni Auth dall'endpoint pubblico, policy e vincolo dal catalogo).

**Rimedio:** la migration 023 rimuove la policy, che nessun codice usa (i profili sono creati solo con la service role key), e la registrazione pubblica va disattivata dal pannello Supabase: gli account dei ristoratori nascono da `auth.admin.createUser`, che funziona anche a registrazione disattivata.

**Chiuso il 2 ottobre 2026** (migration 023 applicata, registrazione pubblica disattivata). Verificato:

```
impostazioni Auth                         → disable_signup: true
signUp con la chiave anon                 → "Signups not allowed for this instance"
utente autenticato senza profilo (creato dal server per la prova):
  INSERT profiles role 'admin'            → 42501 RLS
  INSERT profiles role 'ristoratore'      → 42501 RLS
  is_admin()                              → false
pulizia                                   → utente di test cancellato; 3 utenti, 1 admin come prima
```

### ✅ N18 — Colonne sensibili di `restaurants` leggibili da ogni utente autenticato *(Alto, risolto)*

Emerso il 2 ottobre 2026. La migration 017 restringe per colonna solo il ruolo `anon`; la policy `restaurants: public read published` vale invece per tutti i ruoli. Un utente autenticato qualsiasi — oggi, con la registrazione chiusa, un ristoratore — legge quindi **tutte** le colonne dei ristoranti pubblicati: `activation_token`, email del titolare, `owner_id`, IBAN, partita IVA, account di pagamento. Verificato con un utente di test, poi cancellato.

**Token di attivazione (la parte grave).** Chi lo legge può impossessarsi di un locale pubblicato ma non ancora attivato. Spostato in `restaurant_activation_tokens`, tabella senza policy accessibile solo con la service role key (migration 024); il consumo resta atomico con `claim_restaurant()`, che assegna il proprietario e cancella il token nella stessa transazione. Verificato in locale su ristoranti di prova poi cancellati, 13/13:

```
anon e utente autenticato        → permission denied sulla tabella e sulla funzione
token valido                     → 200, owner_id assegnato, profilo creato, token cancellato
stesso link di nuovo             → 400, messaggio unico
token scaduto / inesistente /
  malformato / ruotato           → 400, nessun proprietario
3 registrazioni simultanee       → [200, 400, 400], nessun falso allarme di utente orfano
```

Chiuso dalla **migration 025** (2 ottobre 2026), applicata dopo il deploy, che elimina le vecchie colonne: verificato che non esistono più e che la registrazione in produzione funziona.

**Email, IBAN, P.IVA fra ristoratori.** Admin e titolari leggono legittimamente queste colonne con lo stesso ruolo `authenticated` di un ristoratore concorrente, quindi una restrizione per colonna non può distinguerli. Si limitano invece le righe:

- **026** — la vetrina legge da `restaurants_public`, vista delle sole colonne pubbliche dei locali pubblicati, uguale per anonimi e loggati; le policy pubbliche di menu, categorie, orari, zone e promo usano `is_published_restaurant()` invece di una sottoquery su `restaurants`, così non dipendono da cosa vede chi interroga.
- **027** — `restaurants: public read published` vale solo per `anon` (che resta limitato per colonna dalla 017). Un utente autenticato vede sulla tabella solo il proprio locale, o tutti se admin.

In produzione esisteva già una vista `restaurants_public`, creata a mano e mai versionata, con le colonne pubbliche più `plan` e nessuna colonna sensibile; nessun codice la usava. La prima versione della 026 falliva per questo (`42P16`, annullata per intero); la vista è stata ricreata con definizione esplicita, conservando `plan`. Stessa deriva di N12 e N14.

Verificato con utenti e ristorante di prova poi cancellati, prima e dopo la 027 (20/20 ciascuna), e in Chrome sulla vetrina di produzione:

```
anon e autenticato non titolare   → vista, menu, categorie, orari, zone, promo leggibili;
                                    la vista non ha colonne sensibili
autenticato non titolare          → prima della 027 legge la riga di convivium; dopo: 0 righe
titolare                          → select('*') del proprio locale, anche in bozza
bozza                             → assente dalla vista, invisibile ad anon
vetrina di produzione (Chrome)    → asporto 21,00 e domicilio 23,50 coincidenti, nessun errore
```

Limite noto: nell'anteprima di un locale in bozza i codici promo non vengono caricati, perché `usePromoCode` risolve il locale dalla sola vista.

### ⚠️ N13 — Stesso pattern, punti ancora aperti

N9, N10, A7 e A8 condividono una sola causa: **un risultato vuoto prodotto da RLS (`data: null`, `count: 0`, `[]`, sempre con `error: null`) trattato come stato legittimo** anziché come possibile blocco di permessi. PostgREST non distingue i due casi, e nessuno dei blocchi `catch` scatta.

Una ricognizione mirata sui contesti anonimi (`src/app/menu/`, `src/app/ordine/`, hook delle pagine pubbliche) ha trovato altri quattro punti. I percorsi in `src/app/admin/` e `src/app/ristoratore/` sono esclusi: girano con sessione autenticata e policy owner corrispondenti.

| # | Punto | Cosa assume | Perché è lo stesso pattern |
|---|---|---|---|
| ✅ a | `menu/[slug]/page.tsx` — `loadHistoryOrders` | modale "I miei ordini": SELECT anon su `orders` per `customer_email` | Identico a N10. `data` è `[]` con `error: null`, il `catch` non scatta mai, l'utente legge "nessun ordine" invece di "non posso mostrarteli". **Risolto il 30 settembre 2026**, vedi sotto |
| b | `menu/[slug]/page.tsx` — canale Realtime anon su `orders`/`bookings` | che i `postgres_changes` arrivino | Passano da RLS: il canale si sottoscrive senza mai consegnare un evento. Oggi mascherato dal polling su `/api/order-status`, che fa tutto il lavoro |
| c | `usePromoCode.ts` — `SELECT id FROM restaurants` | `!restaurant` ⇒ "Ristorante non trovato" | Non rotto oggi (`restaurants` è leggibile da anon), ma il messaggio afferma l'inesistenza sulla base di un risultato vuoto: un futuro restringimento lo renderebbe fuorviante invece che rumoroso |
| d | `useRestaurantSettings.ts` — `maybeSingle()` su `restaurants` | `if (restaurant) {…}` senza ramo else | Come c. Il `throw error` copre solo l'errore esplicito; un vuoto da RLS cade nel nulla e la pagina resta sui `DEFAULT_SETTINGS` |

**a — risolto il 30 settembre 2026.** Ripararlo "per email" con una route server avrebbe riaperto C5: chiunque digitasse l'email di un altro ne avrebbe visto gli ordini. Lo storico usa ora gli UUID degli ordini creati dal dispositivo, salvati in `localStorage` alla conferma, e li rilegge da `/api/order-status/[orderId]`: è la stessa prova di possesso del tracking, e la risposta non contiene dati personali. La modale non chiede più l'email. La route è stata estesa con data dell'ordine e personalizzazioni delle righe.

Verificato in Chrome sulla vetrina locale: due ordini reali in storico compaiono con tipologia, data e totale, lo scontrino si apre, e un UUID inesistente viene rimosso dallo storico (404). Limite dichiarato: lo storico è per dispositivo e per browser; senza autenticazione del cliente non può essere altrimenti.

b, c e d **non affrontati** al 30 settembre 2026.

### ⚠️ N4 · N5 · N6 — Divergenze minori fra migration e produzione

- `loyalty_points` è creata dalla migration 001 ma **non esiste** in produzione.
- Esiste un bucket `menu-images` che nessuna migration crea e che nessun codice usa.
- Realtime è attivo su tutte e 11 le tabelle; la migration 005 ne prevedeva due (`orders`, `bookings`). Le RLS restano applicate anche via Realtime, quindi non è un'esposizione, ma è più ampio del previsto.

### ⚠️ N14 — Due RPC e una tabella in produzione senza migration

*Aggiornamento del 5 ottobre 2026:* l'elenco degli oggetti esposti dall'API mostra anche la tabella `order_number_counters`, presumibilmente il contatore di `generate_order_number`, anch'essa creata a mano e assente da ogni migration. Va versionata insieme alle due funzioni leggendone la definizione dal catalogo.

`generate_order_number(p_restaurant_id, p_order_type, p_table_number)` e `count_customer_orders(p_restaurant_id, p_customer_email)` sono esposte da PostgREST e usate dal codice (N8, N10), ma nessun file in `supabase/migrations/` le crea. È la stessa deriva di N12: un ambiente costruito dalla sequenza di migration non ha né la numerazione degli ordini né la verifica del primo ordine. La 020 ne ricava la firma dal catalogo proprio per questo. Da versionare leggendone la definizione con `pg_get_functiondef`.

### ✅ M4 — Ordini e prenotazioni pubblici senza rate limit *(Medio, risolto — migration 021)*

`/api/orders` e `/api/bookings` sono pubbliche per necessità. Dal 1 ottobre 2026 hanno un limite per connessione, con contatore in Postgres (`check_rate_limit`, `SECURITY DEFINER`, eseguibile solo dalla service role): su Vercel le istanze non condividono memoria.

| | per IP e ristorante | per IP in totale |
|---|---|---|
| ordini | 30 / 10 min | 100 / 10 min |
| prenotazioni | 10 / 10 min | 30 / 10 min |

Il conteggio per ristorante esiste perché i clienti al tavolo usano spesso il Wi-Fi del locale e condividono l'IP pubblico. Fail open: se il contatore non risponde la richiesta passa e l'errore va nei log.

Verificato in locale dopo la migration: richieste 1-10 accettate, 11ª e 12ª → 429; con la chiave anon la tabella `rate_limits` è illeggibile e la funzione non eseguibile. Nessun captcha: da valutare solo se il limite non bastasse.

### ✅ N15 — A convivium nessun ordine a domicilio era completabile *(Alto, risolto)*

Emerso il 30 settembre 2026 durante il lavoro su C8. L'unica zona di consegna di convivium è attiva, con consegna a 2,50 €, ma ha `caps` vuoto. La vetrina considera servito un CAP solo se compare nell'elenco della zona, quindi per qualunque CAP il checkout a domicilio resta non confermabile. `/api/orders` applica la stessa regola e risponde `zone_unavailable`.

Non era un difetto di codice ma di configurazione. **Risolto il 1 ottobre 2026** compilando l'elenco CAP (oggi `97019`). Verificato in produzione: un ordine a domicilio per quel CAP è accettato e la consegna è calcolata a 2,50 €. Se il locale consegna anche in altri comuni, i CAP vanno aggiunti nello stesso campo, separati da virgola. Prima della correzione di C8 la vetrina mostrava tre zone di esempio inventate (CAP milanesi) quando un ristorante non ne aveva alcuna; sono state rimosse.

### ✅ N16 — Orari e sospensione del servizio non erano verificati dal server *(risolto)*

> **Due correzioni a questo rilievo, entrambe del 30 settembre – 1 ottobre 2026.** La prima stesura sosteneva che la vetrina ignorasse le opzioni dei piatti: **era sbagliato** (vedi la regressione in C8; il listino generico stava in `CustomizationView`, componente mai montato, ora rimosso). La seconda stesura sosteneva che la vetrina ignorasse i flag `delivery_enabled`, `pickup_enabled` e `table_enabled`: è vero, ma **i flag sono vestigiali** e applicarli sarebbe stato un errore. Il wizard salva `pickup_enabled` sempre a `true`, `delivery_enabled` come "esiste almeno una zona attiva" (regola che il server applica già tramite le zone), e `table_enabled` da un'impostazione `tableBooking.enabled` che parte da `false` e non ha alcun controllo nell'interfaccia: imporlo avrebbe bloccato gli ordini al tavolo a tutti i ristoranti.

Il controllo operativo reale è `hours_config`: orari per servizio, chiusure temporanee e `serviceSuspended`, che il ristoratore gestisce dalla pagina Orari. La vetrina lo applica — blocca la consegna sospesa, propone l'ordine per dopo quando il locale è chiuso — ma `/api/orders` no: una pagina rimasta aperta o una chiamata diretta possono creare un ordine per un servizio appena sospeso. Va replicata lato server la stessa logica, che ha casi non banali (ordini programmati ammessi a locale chiuso), quindi con una verifica attraverso l'interfaccia e non solo per sonda.

**Fix (2 ottobre 2026).** Le regole stanno ora in un solo modulo, `src/lib/serviceHours.ts`, usato sia dalla vetrina sia da `/api/orders`. Per consegna e asporto il server rifiuta (409 `schedule_unavailable`) un ordine se il locale è chiuso per ferie, se il servizio è sospeso, se manca l'orario, o se l'orario è passato, oltre il preavviso massimo o fuori dalle fasce di quel giorno. Valuta sull'ora di Roma, con 15 minuti di tolleranza sul preavviso minimo per il tempo di compilazione del modulo. Gli ordini al tavolo sono esclusi.

Ricostruendo la logica sono emersi tre difetti della vetrina, corretti insieme perché vetrina e server devono dire la stessa cosa:

- **Chiusura a mezzanotte.** Il controllo "aperto ora" confrontava gli orari come stringhe: con una fascia 18:30–00:00, alle 20:00 `"20:00" <= "00:00"` è falso. **Convivium risultava chiuso per tutto il servizio serale** e il cliente vedeva "Locale Chiuso — puoi ordinare per dopo". "00:00" come fine fascia vale ora mezzanotte.
- **Preavviso in italiano.** Il pannello salva l'unità come `"ore"` / `"minuti"`, la vetrina riconosceva solo `"hours"`: il preavviso di 1 ora per la consegna di convivium valeva 1 minuto.
- **Sospensione aggirabile.** Quando entrambi i servizi risultavano chiusi la vetrina proponeva gli ordini per dopo anche per un servizio sospeso. Ora un servizio sospeso o un locale in ferie non offre orari.

Verificato:

```
modulo, sulla configurazione reale di convivium          21/21 scenari
  (mezzanotte, giorno di chiusura, pranzo disattivato, preavviso "1 ore",
   oltre 4 giorni, sospensione di un solo servizio, ferie, conversione di fuso)
Chrome, checkout intercettato: primo orario proposto per asporto e per
  domicilio accettato dal server, totale coincidente (21,00 e 23,50)
route: senza orario, giorno chiuso, orario passato, oltre il preavviso
  massimo, fascia disattivata → 409 schedule_unavailable;
  orario valido e ordine al tavolo → proseguono
```

**Limite noto, legato ad A13:** l'elenco dei giorni nella vetrina usa la data UTC (`toISOString`). Fra mezzanotte e le 2 ora italiana "Oggi" corrisponde ancora al giorno precedente, e il server rifiuterebbe come passato un orario scelto lì. La finestra cade fuori dagli orari di quasi tutti i locali; si chiude con la gestione dei fusi.

**Corretto nel frattempo (1 ottobre 2026):** un residuo di una funzione di test di maggio ("Simula 12:15 — Solo Asporto") era rimasto agganciato all'orologio reale. Ogni giorno alle 12:15 il pulsante della consegna a domicilio si disattivava e chi lo aveva scelto veniva spostato su asporto. Rimosso; checkout riverificato in Chrome con la richiesta intercettata (totale mostrato e ricalcolato coincidono, nessun errore di pagina).

---

## Rilievi della prima stesura confermati — dettaglio (aperti e risolti)

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

### ✅ C6 — Nessun pagamento viene mai incassato *(Critico, risolto — Stripe Connect, migration 028–035)*

**Situazione originale (22 settembre).** Nessun SDK di pagamento fra le dipendenze, nessuna route di pagamento, nessun webhook, nessuna colonna `payment_status`. Il metodo scelto dal cliente finiva solo in `sessionStorage`; il cliente sceglieva "Carta di credito", vedeva "Elaborazione…", riceveva la conferma, il ristoratore vedeva l'ordine in cucina, e nessuno dei due sapeva che non era stato addebitato nulla.

**Risolto dal 2 al 7 ottobre 2026** (release 1.31.0–1.37.0, migration 028–035).

*Modello.* Ogni ristorante incassa sul **proprio** account Stripe (direct charges, API Accounts v2, dashboard completa): i fondi non passano da InnovaGo, nessuna commissione per la piattaforma, commissioni e contestazioni a carico di Stripe e del ristorante. Il collegamento lo scrive solo il server leggendolo da Stripe (A9).

*Flusso.*

1. `/api/orders` crea l'ordine in `awaiting_payment` e un PaymentIntent con **`capture_method: manual`** sull'account del ristorante. L'importo è il totale ricalcolato dal server (C8), mai quello del client.
2. Il checkout mostra il Payment Element di Stripe: un iframe del gateway, nessun dato di carta passa dalla pagina (C7).
3. Il webhook firmato `/api/stripe/webhook` (registro `stripe_events` contro i duplicati) riceve `payment_intent.amount_capturable_updated`, verifica account e importo e porta l'ordine a `new` con `payment_status = 'authorized'`. Se i controlli falliscono annulla l'autorizzazione.
4. **Il ristorante accetta** → `/api/order/accept` cattura l'importo (`paid`). **Rifiuta** → `/api/order/cancel` annulla l'autorizzazione (`voided`: nessun addebito, nessun rimborso da gestire) oppure, se l'ordine era già incassato, rimborsa (`refunded`). **Non risponde in tempo** → l'ordine scade e l'autorizzazione viene annullata (N19).
5. Un job `pg_cron` + `pg_net` chiama ogni minuto `/api/cron/expire-authorizations`, che fa scadere ordini e prenotazioni non accettati anche a pannello chiuso e cliente uscito dalla pagina (`scripts/cron-expire-authorizations.sql`, eseguito a mano: contiene un segreto).

*Perché autorizzazione e cattura separate.* Un solo timer per ogni metodo di pagamento, nessun rimborso nei casi di rifiuto e scadenza, nessuna commissione Stripe persa. Costo: il blocco sulla carta può restare visibile qualche giorno per alcune banche, e il Payment Element offre solo i metodi che supportano la cattura manuale (carte, Apple Pay, Google Pay).

*Difese nel database.* Le colonne di pagamento (`payment_status`, importi, id Stripe, `authorized_at`, `accept_deadline`, `acceptance_mode`) non sono scrivibili dal browser (trigger 028, rifatto in 030, 032, 034 e 035); un ordine con pagamento autorizzato non cambia stato dal browser; uno pagato non si annulla senza rimborso; uno non pagato non entra in preparazione (N23).

*Verifiche.* Collaudo in modalità test del 7 ottobre 2026: accettazione entro la finestra, rifiuto e scadenza a 3 minuti; scarto automatico — il job pianificato risponde `200` con `{"ok":true}`. **Non ancora provato in modalità live.** Vedi il Blocco 7 per cosa serve prima.

### ✅ C7 — Dati completi di carta raccolti in chiaro nel browser *(Critico, risolto)*

`CardPaymentForm.tsx` implementa a mano numero carta, scadenza e CVV con validazione Luhn locale, e i valori risalgono agli state `cardNumber`, `cardExpiry`, `cardCvv` del componente padre. È ciò che PCI-DSS vieta a un merchant senza certificazione SAQ-D: PAN e CVV devono stare in un iframe del gateway, non nel DOM dell'applicazione. Che i dati non vengano poi trasmessi non elimina il rischio, lo sposta: un'estensione del browser o uno script di terze parti li intercetterebbe.

*(TypeScript conferma il punto: `cardNumber`, `cardExpiry` e `cardCvv` risultano dichiarati e mai letti.)*

**Risolto il 2 ottobre 2026** rimuovendo `CardPaymentForm` e le opzioni "Carta di Credito" e "PayPal" dal checkout: erano mostrate a chiunque avesse autodichiarato il collegamento a Stripe o PayPal (A9) e non incassavano nulla (C6). Finché non arriva l'integrazione Stripe Connect il cliente sceglie fra POS e contanti; verificato in Chrome. Il pagamento online è tornato il 6 ottobre 2026 con il Payment Element di Stripe, in un iframe del gateway: nessun dato di carta passa dalla pagina (vedi C6). Rimossi nello stesso intervento i campi IBAN/bonifico, mai usati da alcun flusso.

### ✅ C8 — Prezzi e totali decisi dal client *(Critico, risolto — migration 020)*

`orders: public insert WITH CHECK (TRUE)` — confermata in produzione — consente di inserire una riga con qualsiasi contenuto. `subtotal`, `delivery_fee`, `discount`, `total` e il `price` di ogni articolo arrivano già calcolati dal browser, e nulla li ricalcola a partire da `menu_items.price`.

Sonda: un ordine con `total: 1` è stato inserito come utente anonimo senza alcuna obiezione. Anche `order_number`, `status` e `restaurant_id` sono scelti dal client, quindi è possibile inserire ordini falsi nel pannello di un concorrente o crearli già in stato `preparing`.

**Fix (30 settembre 2026).** Ordini e prenotazioni della vetrina passano ora da due route server con service role key, `/api/orders` e `/api/bookings`. Il browser invia solo *cosa* ordina: id del piatto, quantità, nomi delle aggiunte, dati del cliente. Ogni importo viene ricalcolato:

| Voce | Fonte lato server |
|---|---|
| prezzo base | `menu_items.price`, solo piatti `available` dello stesso ristorante |
| opzioni del piatto | `menu_items.option_groups`, i gruppi configurati dal ristoratore nel wizard |
| consegna, gratuità, ordine minimo | `delivery_zones`, stessa regola di corrispondenza del CAP |
| sconto | `promos`, riverificato per intero (date, modalità, minimo, primo ordine) |
| `order_number`, `status`, `restaurant_id` | database e route, mai dal client |

Il client invia anche il totale che il cliente ha visto; se non coincide con il ricalcolo, l'ordine **non viene creato** (409). Il consumo della promo resta prima dell'insert, e se l'insert fallisce l'utilizzo viene restituito: questo chiude anche l'effetto residuo di A8. Il pre-ordine delle prenotazioni è prezzato allo stesso modo, perché alla conferma del ristoratore diventa un ordine vero.

Verificato in locale contro il database di produzione, sui soli percorsi di rifiuto (conteggi di `orders` e `bookings` invariati prima e dopo):

```
totale manomesso (atteso 24,70)   → 409 price_changed, ricalcolo 18 + 1,20 + 4 + 1,50 = 24,70
aggiunta fuori listino            → 409          stile pizza su un primo → 409
piatto inesistente / di altri     → 409          CAP non servito        → 409
promo inesistente                 → 409
payload malformato (qty 0, id non UUID, carrello vuoto, orario 25:00) → 400
```

> **Regressione, introdotta e corretta il 30 settembre 2026.** La prima versione di `/api/orders` validava le aggiunte contro il listino generico di `CustomizationView` (vedi la correzione in N16), non contro le opzioni vere dei piatti. Dal deploy fino alla correzione, **ogni ordine con un'opzione scelta — per esempio un impasto o un ingrediente aggiunto — veniva rifiutato** con "Le opzioni di un piatto sono cambiate". Gli ordini senza opzioni passavano. Le sonde non l'avevano intercettato perché usavano esse stesse il listino sbagliato.
>
> Corretto validando ogni aggiunta contro gli `option_groups` del piatto letti dal database: il nome deve esistere e il prezzo inviato deve coincidere con uno di quelli configurati per quel nome, altrimenti la riga è rifiutata. Il prezzo addebitato è sempre quello del menu.
>
> Verificato questa volta **attraverso l'interfaccia**, in Chrome, con la chiamata a `/api/orders` intercettata prima del server: piatto con impasto "Ai Cereali" (+2 €) e "Bufala" (+4 €), totale mostrato 21,00 €, totale ricalcolato dal server sullo stesso payload 21,00 €. Sonde dirette: 2 × (15 + 2 + 4) = 42 € ricalcolato correttamente; prezzo di un'opzione manomesso a 0, opzione inesistente, vecchio formato e vecchio listino generico → rifiutati.

**Chiuso dalla migration 020**, applicata il 30 settembre 2026 dopo il deploy: rimuove `public insert` da `orders`, `order_items` e `bookings`, e toglie ad `anon` l'esecuzione di `increment_promo_usage` (con cui chiunque poteva esaurire gli utilizzi di una promo) e di `generate_order_number`.

Prima della migration, un ordine di prova completo, creato dalla route in locale e rimosso subito, è stato registrato con numero dalla sequenza, righe e importi del server: 2 × (18 + 1,20) + (4 + 1,50) = 43,90 €. Dopo la migration, sonda con chiave anon e route in produzione, nessuna scrittura (conteggi invariati):

```
anon INSERT orders / order_items / bookings   → 42501 new row violates row-level security policy
anon RPC increment_promo_usage                → 42501 permission denied
anon RPC generate_order_number                → 42501 permission denied
anon RPC expire_order                         → OK (resta pubblica, come previsto)
PROD /api/orders con totale errato            → 409 price_changed, ricalcolo 18,00 €
```

**Non verificato con una sonda:** l'INSERT del proprietario tramite la nuova `orders: owner insert`, usata quando il ristoratore conferma una prenotazione con pre-ordine. Richiede una sessione autenticata da ristoratore.

### ✅ C9 — Overbooking illimitato *(Critico, risolto — migration 022)*

`tables_count` compare solo in `/ristoratore/tavoli` (QR code) e nel wizard admin, mai nel flusso di prenotazione. Non esiste `UNIQUE`, non esiste `EXCLUDE`, non esiste advisory lock, non esiste conteggio delle prenotazioni sullo slot, non esiste una tabella dei tavoli. Non è una race condition da chiudere: la verifica è assente, quindi il problema si manifesta anche con richieste sequenziali. `guests` è raccolto ma mai confrontato con una capienza.

**Fix (1-2 ottobre 2026).** Modello a coperti per fascia ("pacing"), lo stesso livello di base delle piattaforme di prenotazione; i tavoli come entità restano un'estensione futura.

- `restaurants.booking_capacity` (coperti accettati in contemporanea) e `booking_slot_minutes` (durata del turno, default 90), impostabili dal ristoratore nella pagina Prenotazioni.
- `/api/bookings` crea la prenotazione con `create_booking()`, che calcola il **picco** di coperti nella fascia e inserisce sotto un advisory lock per (ristorante, data). Ristoranti diversi non si attendono mai a vicenda.
- Contano le richieste `pending` e `confirmed`, non le cancellate.
- **Capienza vuota = nessun limite automatico**, per scelta: ogni prenotazione nasce in attesa e il ristoratore la conferma a mano, mentre un valore predefinito sarebbe sbagliato per quasi tutti i locali. Il pannello mostra un avviso finché la capienza non è impostata e, accanto a ogni prenotazione, i coperti occupati nella fascia.

Verificato il 2 ottobre 2026 su un ristorante fittizio in bozza (capienza 8, turno 90 minuti), creato e poi cancellato senza residui; 13 scenari su 13 superati:

```
20:00 x4, 20:30 x4                  → accettate (picco 8/8)
21:00 x1                            → rifiutata, 0 posti
21:30 x2                            → accettata (il tavolo delle 20:00 si è liberato)
19:50 x4 fra 19:00 x4 e 20:40 x4    → accettata: i due tavoli non sono mai insieme
x4 con 3 posti liberi               → rifiutata, available 3;  x3 → accettata
dopo una cancellazione da 5         → x5 accettata
12 richieste simultanee x1          → 8 accettate, 4 rifiutate, 8 coperti salvati
capienza vuota                      → x20 accettata
route in produzione                 → 201; poi x4 con 2 posti → 409 "restano solo 2 posti"
```

Verificato il 2 ottobre 2026 anche dal pannello, con un ristoratore di prova poi cancellato: la scheda Capienza compare con l'avviso "non impostata" e il salvataggio scrive `booking_capacity` nel database. Il badge di occupazione non è stato visto con prenotazioni reali; il suo calcolo replica in TypeScript quello della funzione SQL.

### ✅ C3′ — Lettura pubblica di `restaurants` per riga intera *(Medio, risolto)*

Riformulazione di C3 alla luce dei fatti. La policy pubblica **non era presente** (da cui N1) ed è stata **reintrodotta dalla migration 015** perché senza di essa la vetrina non funziona. Le RLS filtrano righe e non colonne, quindi la riga è ora leggibile per intero.

Oggi l'esposizione concreta è limitata a `restaurants.email` (indirizzo personale del proprietario) e `owner_id`: `vat_number`, `online_payment_account`, `iban_holder`, `paypal_email` e `stripe_account_label` sono **tutti NULL**. Diventeranno pubblici nel momento in cui un ristoratore compilerà l'IBAN dalla pagina Pagamenti.

**Risolto** dalla migration 017 (`REVOKE` di tabella più `GRANT` delle sole colonne ammesse) insieme alla select esplicita in `useRestaurantSettings.ts`. Verificato in produzione con la chiave anon: la select della vetrina funziona, mentre `select('*')` e `select('online_payment_account')` restituiscono entrambe `permission denied`.

> **Nota su un errore da non ripetere.** La prima stesura della 017 usava solo una `REVOKE` per colonna. In PostgreSQL una revoca per-colonna non sottrae nulla a una concessione per-tabella, e Supabase assegna ad `anon` un `GRANT SELECT` sull'intera tabella: la migration è passata **senza errori e senza alcun effetto**. È il motivo per cui il file contiene ora una sezione di verifica esplicita — l'assenza di errori non è prova che una restrizione sia attiva.

### ✅ A9 — Collegamento ai gateway autodichiarato *(Alto, risolto)*

Il pannello Pagamenti e il wizard scrivevano `stripe_connected` e `paypal_connected` da una finestra demo che chiedeva solo un'email. Dal 6 ottobre 2026 (migration 028, corretta dalla 029) un trigger su `restaurants` impedisce a titolari e admin di modificare lo stato del collegamento, l'id dell'account Stripe, l'etichetta e i dati PayPal: li scrive solo il server. I salvataggi che rimandano gli stessi valori passano, quindi il pannello attuale continua a funzionare; la finestra demo "Connetti" produce invece un errore, ed è voluto. **Chiuso il 6 ottobre 2026 (release 1.31.0 e 1.32.0).** Il collegamento è reale: `/api/stripe/connect` crea l'account Stripe del ristorante (API Accounts v2, dashboard completa, commissioni e perdite a carico di Stripe e del ristorante) e apre la procedura di Stripe; lo stato lo scrive solo il server leggendolo da Stripe (`/api/stripe/status` e webhook `account.updated`). Il pannello Pagamenti mostra lo stato e il pulsante di collegamento; il wizard admin solo lo stato, perché la procedura — documento e IBAN — spetta al titolare. PayPal è segnalato come "in arrivo": l'API v2 di Stripe non lo supporta e arriverà con l'integrazione nativa.

Collaudi, con titolare, ristorante e account Stripe di prova poi cancellati: lato server 19/19 (creazione dell'account con il modello scelto, nessun doppione, webhook con firma verificata, idempotenza, revoca dell'accesso), pannello in Chrome 19/19 (stato, apertura della procedura Stripe, ritorno, link scaduto, salvataggio senza errori, invito in dashboard). Non verificato con un account admin reale: il passo pagamenti del wizard, che è in sola lettura.

Collaudo della base dei pagamenti (028 + 029), su ristorante e titolare di prova poi cancellati, 43/43: autodichiarazione Stripe e PayPal bloccata con 42501; ordine in attesa di pagamento che il titolare può solo annullare; stati e importi di pagamento non scrivibili dal browser; pagamento online al tavolo, rimborso oltre l'incassato e PaymentIntent duplicato rifiutati dal database; registro eventi del webhook inaccessibile e senza doppioni; restituzione dei promo una sola volta; colonne IBAN eliminate e vista pubblica funzionante. La prima versione del trigger rispondeva 22P02 invece di 42501 (accumulo con `text[] || 'nome'`): bloccava comunque, con il messaggio sbagliato; corretto dalla 029.

### A2 · A4 · A13 · A15 — invariati

Confermati come nella prima stesura. In particolare, verificati sul DB:

- **A2** — `my_restaurant_id()` ha ancora `LIMIT 1` senza `ORDER BY`: la piattaforma supporta di fatto un solo ristorante per account.
- **A4** — `promos: public read active` è presente e consente di enumerare i codici sconto attivi di tutti i ristoranti pubblicati. Oggi latente: 0 promo a sistema.

*(A6, A8 e A12 sono stati chiusi e hanno una sezione propria qui sopra. A10 è chiuso: sezione qui sotto.)*

### ✅ A10 — Nessun flusso di rimborso, ma l'email lo promette *(Alto, risolto — migration 030 + 032)*

L'email di annullamento prometteva un rimborso che nessun codice eseguiva. Ora `/api/order/cancel` è l'unica via di annullamento: se l'ordine era già incassato **rimborsa su Stripe prima di annullare** (e non annulla se il rimborso fallisce), se era solo autorizzato annulla l'autorizzazione. Il database rifiuta l'annullamento diretto di un ordine pagato o autorizzato. `send-status-email` promette il rimborso solo quando c'è stato davvero (`refunded` / `partially_refunded`) e altrimenti scrive "non ti è stato addebitato alcun importo". Gli eventi `charge.refunded` del webhook aggiornano `refunded_amount`. Non gestiti: rimborsi parziali avviati dal ristoratore, contestazioni (`charge.dispute.created` è solo registrata nei log).

### ✅ A1 — Area admin decisa da un cookie scritto dal browser *(Alto, risolto)*

Il middleware richiedeva una sessione Supabase valida, ma sceglieva l'area da aprire in base al cookie `igodelivering_role`, impostato dal browser al login e modificabile da chiunque. Un ristoratore autenticato poteva impostarlo ad `admin` ed entrare nelle pagine `/admin/*`. I dati restavano protetti — RLS su `is_admin()` e controllo del ruolo nel database nelle 6 route `/api/admin/*`, verificate una per una — ma il confine dell'area dipendeva da un valore scelto dal client.

**Risolto il 2 ottobre 2026:** il middleware legge il ruolo da `profiles` a ogni navigazione protetta; le scritture del cookie dal browser (login, reset password, accesso admin, AuthContext) sono rimosse e il middleware cancella il cookie dove ancora presente.

Verificato in Chrome con un ristoratore di prova poi cancellato, login dalla pagina reale:

```
anonimo su /ristoratore/* e /admin/*            → /login e /admin, anche con cookie "admin"
login ristoratore                               → /ristoratore/dashboard
ristoratore con cookie falso "admin" su /admin  → respinto verso /ristoratore/dashboard
cookie legacy                                   → cancellato dal middleware
```

Non verificato con un account admin reale: il ramo admin del middleware è simmetrico a quello del ristoratore.

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

*Scelta di perimetro del 25 settembre, superata:* per le prenotazioni la scadenza restava solo lato interfaccia. **Dal 7 ottobre (migration 034) anche le prenotazioni hanno `accept_deadline` e lo stato `expired`**, e la scadenza di ordini e prenotazioni la registra il server (route di tracking, pannello, cron), non più la RPC `expire_order` chiamata dal browser: la RPC resta nel database ma l'applicazione non la usa più. Vedi N19.

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

**Effetto collaterale noto:** se l'insert dell'ordine fallisce dopo l'incremento, quell'utilizzo resta consumato a vuoto. *Compensato dal 30 settembre 2026* in `/api/orders` (vedi C8), che restituisce l'utilizzo quando l'ordine non va a buon fine.

### ✅ A6 — Tracking per `order_number` *(risolto)*

Il tracking cercava con `.eq('order_number', …).maybeSingle()`. Il difetto è chiuso alla radice: la ricerca avviene ora per **UUID**, che è univoco globalmente, quindi la collisione fra ristoranti non può più manifestarsi. Vedere N9 per il resto dell'intervento.

`order_number` resta visualizzato come riferimento leggibile per il cliente, ma non è più chiave di lookup in alcuna query o route. N8, la collisione in fase di INSERT, è stato chiuso separatamente spostando la numerazione su una sequenza di database.

### ✅ A12 — `/api/order/send-status-email` senza autenticazione *(risolto)*

La route usa la service role key e legge l'ordine completo per comporre il messaggio. Non verificava nulla: chiunque, senza sessione, poteva inviare email di "ordine accettato" o "ordine annullato" a nome di qualunque ristorante, per qualunque `orderId`.

**Risolto** applicando lo stesso schema di `/api/admin/send-activation-email`: `createServerClient` + `getUser()` → 401, controllo del ruolo su `profiles` → 403, esteso a `ristoratore | admin`. In più, per il ristoratore, l'ordine deve appartenere al proprio locale (`order.restaurants.owner_id === user.id`); l'admin non ha questo vincolo.

**Nessuna deroga per il contesto anonimo**, perché non esiste: l'unico chiamante è `updateOrderStatus` in `src/hooks/useOrders.ts`, nel pannello autenticato. L'email di conferma post-checkout non passa da questa route. Se un giorno la si aggiunge, va vincolata a un ordine creato da pochi minuti — annotato nel docstring.

Verificato: POST anonimo → 401 su entrambi gli stati; POST con cookie di sessione falsi → 401.

---

### ✅ N19 — Il timer di 3 minuti non scattava per nessun ordine *(Alto, risolto — migration 034)*

L'opzione "il prima possibile" è disattivata nel checkout (`showAsapOption = false`): ogni ordine di asporto o consegna parte con un orario scelto, quindi con `scheduled_at`. Tracker del cliente, pannello e logica di scadenza trattavano `scheduled_at` come "ordine programmato, nessuna scadenza". Conseguenze verificate nel codice: il cliente non vedeva mai il conto alla rovescia; gli ordini in contanti e POS con orario non scadevano mai; solo gli ordini al tavolo avevano davvero i 3 minuti. Per i pagamenti online la scadenza era l'orario scelto, quindi un cliente poteva restare in attesa per ore.

**Regola unica, decisa dal server alla creazione** (`src/lib/acceptance.ts`, valida per asporto, domicilio, tavolo e prenotazioni, con contanti, POS e carta):

| Quando ordina | `acceptance_mode` | Scadenza (`accept_deadline`) | Cliente |
|---|---|---|---|
| Locale **aperto** (qualunque orario scelto) | `live` | 3 minuti da quando l'ordine arriva al ristorante (per la carta: dall'autorizzazione) | conto alla rovescia in diretta |
| Locale **chiuso** (preordine) | `deferred` | 1 ora dopo la **prossima apertura** (tetto 6 giorni: limite delle autorizzazioni di carta) | niente timer, la scadenza è scritta per esteso |

Gli ordini al tavolo, fatti da dentro il locale, sono sempre `live`. Un'ora e non 15 minuti: un locale non sempre apre in punto o ha già acceso il gestionale, e i preordini arrivano tutti insieme (`DEFERRED_GRACE_MINUTES`). Scaduta la scadenza, ordine e prenotazione diventano `expired` (migration 034 aggiunge lo stato alle prenotazioni) e un'autorizzazione di carta viene annullata. Cliente, pannello e cron leggono lo stesso dato; gli ordini nati prima della regola, privi di modalità, si comportano come prima.

Dal lato cliente: dopo un ordine non accettato il pulsante "Riordina" rimette il carrello e "Chiama il locale" apre il telefono; le prenotazioni di solo tavolo mostrano timer o scadenza e l'esito. Dal lato ristoratore: ogni scheda in attesa mostra "Accetta entro mm:ss" (o "Preordine: da confermare entro…"); un ordine scaduto offre "Chiama" e, per contanti e POS, "Riattiva" con conferma — il pulsante "Rifiuta" è stato tolto perché mandava al cliente un secondo messaggio di annullamento dopo che aveva già letto "nessuna risposta". Le prenotazioni scadute si leggono "Scaduta" e si possono ripristinare.

*Calcolo verificato a mano* con orari di prova (pranzo 12:00–14:30, cena 19:00–22:30, lunedì chiuso): mercoledì 20:00 → `live`, scadenza 20:03; mercoledì 15:30 → `deferred`, 20:00; mercoledì 23:30 → giovedì 13:00; domenica 23:30 salta il lunedì chiuso → martedì 13:00; passaggio all'ora solare del 25 ottobre gestito. Non provato nel browser.

### ✅ N20 — Il pannello cucina non mostrava piatti né personalizzazioni *(Alto, risolto)*

Il dettaglio dell'ordine e la stampa leggevano `selectedOrder.items` e i campi `addedIngredients` / `removedIngredients`: per gli ordini che arrivano dal database esistono invece `order_items` con colonne `added_ingredients`, `removed_ingredients`, `note`. Il "Riepilogo Piatti" era vuoto e impasto, aggiunte, rimozioni e note non raggiungevano la cucina. Ora una sola funzione (`orderLines`) normalizza le righe e le usano schede, dettaglio e stampe, con il prezzo di ogni supplemento. *Non verificato su un ordine reale in cucina: da controllare con un ordine che abbia impasto, una rimozione e una nota.*

### ✅ N21 — Ricevuta con supplementi sommati due volte e senza prezzo *(Medio, risolto)*

Il prezzo di una riga nel carrello comprende già i supplementi; la ricevuta (a schermo e nelle due stampe) li sommava di nuovo: 19 € per un piatto da 17 € con totale corretto di 17 €. Corretto a `prezzo × quantità`. In più ogni supplemento a pagamento compare con il prezzo (`+Ai Cereali (+€2.00)`) in ricevuta, stampe, riepilogo del checkout, pagina di tracking e pannello; l'email di stato faceva `join` su oggetti `{name, price}` e stampava `[object Object]`.

### ✅ N22 — "Pubblica Ristorante" non pubblicava *(Medio, risolto)*

Nella pagina di configurazione il pulsante chiamava lo stesso salvataggio di "Salva Bozza", che scriveva lo stato letto dalla schermata (ancora `draft`): il ristorante restava in bozza e la vetrina rispondeva "Ristorante non disponibile" (`/api/orders` accetta solo `published`). Lo stato scelto viene ora passato al salvataggio. Il wizard "nuovo ristorante" era corretto. Resta M9 (`published_at`) per quel wizard.

### ✅ M3 — Prenotazioni retroattive *(Alto, risolto l'8 ottobre 2026)*

L'8 ottobre alle 00:16 è stato possibile prenotare un tavolo per il **7 ottobre alle 18:00**. Cause, tutte verificate nel codice:

1. la data minima del selettore era `new Date().toISOString()`, cioè la data in **UTC**: fra mezzanotte e le due del mattino, ora di Roma, "oggi" risultava ancora ieri;
2. gli orari proposti per la giornata corrente non escludevano quelli già passati (il rilievo M3 originale, rimasto aperto);
3. per un giorno senza orari, o con tutti gli orari passati, la vetrina mostrava un campo libero in cui scrivere qualunque ora;
4. `/api/bookings` non controllava nulla: accettava qualsiasi data e ora valide nel formato.

Ora: la data minima e "oggi" sono quelli di Roma, lo stesso orologio del server; per oggi restano solo gli orari **successivi a quello attuale** (la lista si aggiorna ogni 30 secondi); per un giorno passato nessuno; il campo libero è sostituito dal messaggio "Nessun orario disponibile per questo giorno"; e il server rifiuta con 409 (`booking_in_past`) ogni prenotazione per un giorno passato o per un orario già trascorso da più di 5 minuti (tolleranza per il tempo fra l'apertura della lista e l'invio). La stessa data in UTC falsava anche l'etichetta "Oggi" delle date d'ordine tra mezzanotte e le due: corretto. Gli ordini erano già protetti dal server (`checkSchedule`, `too_soon`).

**Chiusi anche i due casi rimasti fuori dal primo intervento (8 ottobre):**

- *Orari di prenotazione.* `/api/bookings` verifica ora che il giorno non sia di chiusura, sospeso o in chiusura temporanea e che l'orario cada in una fascia di prenotazione del locale (`serviceRanges` con il servizio `reservation`, le stesse regole della vetrina); senza orari configurati non c'è vincolo, come per gli ordini. La vetrina è allineata: per un giorno di chiusura, una chiusura temporanea o un servizio sospeso non propone nessun orario (prima ripiegava sugli orari generali o su pranzo e cena standard, e si poteva prenotare un giorno chiuso). Il server è un po' più largo della vetrina, che toglie un'ora prima della chiusura quando usa gli orari generali.
- *Funzione SQL.* La migration **036** ripete il controllo sul passato dentro `create_booking()` (risposta `{"ok": false, "reason": "past"}`), in minuti interi per non rifiutare tutto nei primi minuti dopo mezzanotte. La funzione è eseguibile solo dalla service role, quindi il rischio era basso: è una difesa in profondità.

### ✅ N24 — Dopo "Prenota e ordina" spariva il pulsante "Prenota tavolo" *(Medio, risolto)*

"Prenota e ordina" porta la pagina in modalità `tavolo` (`setDeliveryType('tavolo')`). Annullando dal banner del tavolo il contesto di prenotazione si azzerava ma la modalità restava `tavolo`: nella modalità tavolo si nascondono "Prenota tavolo", "I miei ordini" e le promozioni, che tornavano solo ricaricando la pagina. Stessa cosa a prenotazione completata. Ora la modalità di partenza viene ricordata e ripristinata quando la prenotazione finisce **e** il checkout è chiuso (finché la schermata di conferma è aperta la pagina non cambia); un cliente già al tavolo con il QR non ha una modalità a cui tornare e non cambia nulla.

### ✅ N23 — Un ordine online non pagato poteva entrare in preparazione *(Medio, risolto — migration 035, da applicare)*

Un ordine online scaduto o annullato ha l'autorizzazione annullata: il cliente non è stato addebitato. Il pannello nascondeva "Riattiva" nella scheda ma non nel dettaglio, e il database non lo impediva: un aggiornamento diretto portava a `preparing` un ordine che nessuno aveva pagato. La migration 035 aggiunge al trigger di guardia la regola: un ordine online non incassato non passa a `preparing`, `ready`, `delivering` o `delivered` dal browser. Contanti e POS non cambiano.

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
| `src/lib/id-generator.ts` → `generateId()` | Non più richiamato da quando `order_number` viene dalla RPC `generate_order_number` (N8, 25 settembre 2026). |

### Funzionalità con interfaccia ma senza sostanza

- **`/admin/sicurezza`** — `mockLogs` è un array vuoto, `handleExport()` dice solo che l'esportazione non è ancora disponibile (prima mostrava "Logs esportati correttamente" senza esportare nulla), non esiste tabella `audit_logs`. La pagina è raggiungibile dalla sidebar come funzionalità a tutti gli effetti.
- **Pagamenti online** — implementati, vedi C6, C7, A9, A10. Restano: PayPal (non integrato; l'API v2 di Stripe non lo supporta), rimborsi parziali dal pannello, gestione delle contestazioni.
- **Gestione tavoli** — genera QR code, ma i tavoli non sono entità: niente capienza, niente stato, nessun legame con le prenotazioni.
- **Ruolo `cliente`** — dichiarato nel tipo `Role`, ma il CHECK su `profiles.role` ammette solo `admin` e `ristoratore`. Non esiste autenticazione per il cliente finale.

### Documentazione divergente

`docs/supabase_schema.md` descrive tabelle inesistenti (`promo_codes`, `menu_item_options`, `audit_logs`), colonne inesistenti (`orders.payment_status`, `profiles.restaurant_id`), enum diversi e una ventina di indici mai creati. `docs/TECHNICAL_SPECIFICATIONS.md` cita "Next.js 14+" e una cartella `src/app/superadmin/` che non esiste.

La cartella `docs/` è esclusa dal versionamento per scelta: è materiale privato, e il costo consapevole è che la divergenza non emerge in review.

---

## Cosa manca per considerare il gestionale davvero completo

### ✅ Blocco 0 — Ripristino del servizio *(completato nella prima tornata, 22–23 settembre 2026)*

- [x] Ripristinata la lettura pubblica della vetrina (mig. 015)
- [x] Corretto il checkout: ordini e prenotazioni tornano a salvarsi
- [x] Lettura pubblica di `restaurants` ristretta alle sole colonne della vetrina (mig. 017)
- [x] Upload storage allineati alle policy per tenant, oggetti esistenti migrati
- [x] 13 indici creati sui percorsi di accesso reali (mig. 016)
- [x] `expired` ammesso dal CHECK (mig. 016) — la scrittura restava inefficace per RLS; chiusa il 25 settembre dalla mig. 018, vedi A7
- [x] Schema Supabase riportato sotto versionamento
- [x] PAT GitHub rimosso dalla configurazione locale

### Blocco 1 — Chiudere le esposizioni residue

- [x] PAT GitHub revocato e rigenerato
- [x] Chiave Resend revocata e ruotata *(resta nello storico Git, ma non è più valida)*
- [x] Autenticare `/api/ristoratore/register` con un token monouso a scadenza (C4)
- [x] Portare il ruolo utente fuori dal cookie client-side (A1)
- [x] Autenticare `/api/order/send-status-email` (A12)
- [x] Rate limit sugli endpoint pubblici (M4, mig. 021: `/api/orders` e `/api/bookings`; altri endpoint pubblici non ne hanno)
- [x] Neutralizzate le migration 007 e 014, che avrebbero reintrodotto C1 e C2 su ogni ambiente nuovo
- [ ] Riconciliare le restanti migration 001-013 con lo schema reale e correggerle
- [x] Aggiungere la migration mancante per `activation_token`/`activation_token_expires_at` (N12, mig. 019)
- [ ] Valutare una restrizione per colonna anche su `orders` e `bookings`: oggi `anon` ha un `GRANT SELECT` di tabella e l'unica difesa è l'assenza di policy permissive

### Blocco 2 — Integrità dei dati d'ordine

- [x] Ricalcolare importi e prezzi **lato server** a partire da `menu_items.price`, ignorando quanto inviato dal client (C8: `/api/orders`, `/api/bookings`, mig. 020)
- [x] Generare `order_number` lato database con una sequenza per ristorante (N8; A6 è chiuso a parte, dal passaggio del tracking a UUID)
- [x] Spostare lato server la scadenza degli ordini (A7, mig. 018)
- [ ] Unificare il vocabolario degli stati fra CHECK, Kanban, tracking ed email *(più ampio dal 7 ottobre: ordini `new/pending/preparing/ready/delivering/delivered/cancelled/expired/awaiting_payment`, `payment_status` `unpaid/pending/authorized/paid/failed/voided/refunded/partially_refunded`, prenotazioni `pending/confirmed/cancelled/expired`)*
- [x] Incrementare `promos.used_count` in modo atomico e far rispettare `max_uses` (A8, mig. 018)
- [x] Compensare l'incremento di `used_count` se l'insert dell'ordine fallisce subito dopo (A8, effetto residuo — in `/api/orders`)
- [ ] Sostituire il delete-and-reinsert del menu con un upsert per chiave stabile

### ✅ Blocco 3 — Pagamenti *(completato in modalità test, 2–7 ottobre 2026)*

- [x] Modello: Stripe Connect, il ristoratore è merchant, direct charges, nessuna commissione di piattaforma
- [x] Onboarding reale: `stripe_connected` deriva da una connessione verificata da Stripe (A9)
- [x] `CardPaymentForm` sostituito dal Payment Element, ospitato dal gateway (C7)
- [x] `payment_method`, `payment_status`, `stripe_payment_intent_id`, `paid_amount`, `refunded_amount` (+ `authorized_at`, `accept_deadline`, `acceptance_mode`)
- [x] Webhook con verifica della firma e tabella degli eventi processati (`stripe_events`)
- [x] Macchina a stati ordine↔pagamento: `awaiting_payment` → `authorized` → `paid`, con `voided`, `failed`, `refunded`, `partially_refunded`; scadenze e casi di fallimento
- [x] Rimborsi e annullamento delle autorizzazioni; email allineata (A10)
- [ ] Provare tutto in modalità **live** (Blocco 7)
- [ ] Rimborsi parziali dal pannello; gestione delle contestazioni (oggi solo log)
- [ ] PayPal e altri metodi che non supportano la cattura manuale

### Blocco 4 — Prenotazioni degne di un gestionale

- [ ] Modellare i tavoli come entità (numero, capienza, sala)
- [ ] Durata del turno e calcolo della disponibilità reale per slot
- [x] Impedire l'overbooking **a livello di database**, non solo nell'interfaccia (C9, mig. 022)
- [ ] Fuso orario per ristorante; smettere di dedurre l'ora dal browser del cliente
- [x] Escludere gli slot già passati nella giornata corrente e i giorni passati (M3, 8 ottobre, vedi sotto)
- [ ] No-show, modifiche last-minute, overbooking intenzionale configurabile
- [ ] Conferma al cliente via email o SMS *(la schermata mostra ora timer, esito e scadenza; l'email di conferma della prenotazione no)*

### Blocco 5 — Completare ciò che è abbozzato

- [ ] `audit_logs` reale e `/admin/sicurezza` collegata
- [ ] Decidere il destino di `loyalty_points` (oggi nemmeno creata in produzione)
- [ ] Incrementare `orders_count` o rimuovere la statistica
- [ ] Autenticazione del cliente finale (magic link)
- [ ] Decidere se supportare più ristoranti per proprietario; in tal caso rifare `my_restaurant_id()` e l'`AuthContext`
- [ ] Rimuovere il bucket orfano `menu-images`; allineare Realtime alle tabelle che servono

### Blocco 6 — Robustezza e qualità

- [ ] Disattivare `ignoreBuildErrors` e `ignoreDuringBuilds`, sanare quanto emerge *(il 7 ottobre `tsc --noEmit` passa senza errori: `ignoreBuildErrors` si può provare a spegnere; `ignoreDuringBuilds` riguarda ESLint e non è stato verificato)*
- [ ] Sostituire i 108 `catch` muti con stati d'errore visibili
- [x] Sostituire i 25 `alert()` e gli 11 `confirm()` nativi (release 1.35.0: toast e conferme in `src/lib/notify.ts`; 33 chiamate sostituite)
- [ ] Introdurre una suite di test: oggi non ne esiste alcuna, e **nessuno dei guasti trovati durante l'audit (22–25 settembre 2026) sarebbe stato intercettato automaticamente**
- [ ] Paginare le query non limitate
- [ ] Rimuovere il codice morto

---

### Blocco 7 — Messa in produzione dei pagamenti *(da fare prima del primo incasso reale)*

- [ ] Endpoint webhook Connect anche in modalità **live**, con tutti gli eventi (`account.updated`, `account.application.deauthorized`, `payment_intent.amount_capturable_updated`, `.succeeded`, `.payment_failed`, `.canceled`, `charge.refunded`, `charge.dispute.created`) e il suo `STRIPE_WEBHOOK_SECRET`
- [ ] Chiavi live su Vercel; account Stripe di un ristorante vero collegato in live
- [ ] Un ordine reale da pochi euro: autorizzazione, accettazione, incasso, poi rimborso
- [ ] Verificare che il job di scarto giri anche in live: `CRON_SECRET` impostato, `net._http_response` con `200`
- [ ] Provare a pannello chiuso un ordine non accettato e controllare su Stripe "Annullato" e nel database `expired` / `voided`
- [ ] Applicare la migration 035
- [ ] Pulire gli ordini e le prenotazioni di collaudo (`scripts/db-clean-test-data.sql`)

---

## Lezione di metodo

Il guasto più grave — vetrina e checkout non funzionanti per i clienti — **non era individuabile leggendo il codice**, perché il codice era corretto rispetto alle migration. Era la produzione a essere diversa. Allo stesso tempo, la prima revisione ha dichiarato infondati C1, C2 (Critici) e A3 (Alto), che erano invece problemi reali già chiusi da un intervento manuale sul database: non trovandone traccia né nelle migration né nel catalogo, ha scambiato l'assenza di un record dell'intervento per l'assenza del problema. Gli unici rilievi davvero smentiti sono C5 e A5.

Entrambi gli errori hanno la stessa radice: nessuna fonte di verità sullo schema. Tenerlo versionato e riconciliato non è ordine formale — è la precondizione perché qualunque ragionamento sulla sicurezza di questo sistema sia attendibile.

`scripts/inspect-schema.sql` è in repo proprio per questo: rieseguirlo periodicamente e confrontarlo con le migration è il modo più economico per accorgersi in tempo della prossima deriva. N12 mostra che la deriva continua: due colonne su cui poggia il flusso di attivazione esistono in produzione e in nessuna migration.

**Corollario dalla tornata del 25 settembre.** Leggere il codice non basta a stabilire se una scrittura abbia effetto. Tre dei rilievi chiusi presentavano codice apparentemente corretto — l'`await` c'era, il `catch` c'era, l'`error` veniva controllato — e non facevano nulla. Solo una sonda che esegue l'operazione e poi **rilegge lo stato con un'identità diversa** lo rende visibile. Da qui la forma usata in tutte le verifiche della tornata del 25 settembre: agire con la chiave anon, rileggere con la service role key, confrontare.

Vale anche in senso inverso: la stessa disciplina ha smentito una mia conclusione. Avevo dedotto dall'UPDATE a zero righe che la policy `orders: public update expired` non fosse attiva; l'ispezione del catalogo registrata in C1 la elenca invece fra le policy presenti. La causa era un'altra — la mancanza di una policy SELECT che rendesse la riga individuabile — e il commento della migration 018 è stato corretto di conseguenza. Un'inferenza da sintomo non sostituisce una verifica diretta, nemmeno quando il sintomo è reale.

**Corollario dalla fase pagamenti (7 ottobre).** Un comportamento voluto non è un comportamento presente: il timer di 3 minuti era scritto, commentato e coperto da un'intera logica di scadenza, e non scattava per nessun ordine, perché una scelta fatta altrove (disattivare "il prima possibile") cambiava il significato di un campo (`scheduled_at`) su cui quella logica si appoggiava. Si è visto solo mettendosi nei panni del cliente e chiedendosi cosa vede, passo per passo, in ogni caso. Per i flussi che coinvolgono denaro vale quindi una regola in più: **scrivere per ogni caso — cliente e ristoratore, locale aperto e chiuso, carta e contanti — cosa si vede e cosa succede, e provarlo**, invece di verificare solo che il codice faccia ciò che dice.
