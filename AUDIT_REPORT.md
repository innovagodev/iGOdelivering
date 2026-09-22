# AUDIT REPORT — iGOdelivering v1.29.2

**Commit di riferimento:** `c144d72` (branch `main`)
**Prima stesura:** 22 settembre 2026 — analisi statica del codice
**Revisione:** 22 settembre 2026 — verifica contro il database di produzione
**Perimetro:** 39.443 righe TypeScript/TSX in `src/` (100% dei file), 17 migration SQL, configurazione Next.js, documentazione, storico Git.

---

## ⚠️ Nota metodologica — leggere prima della tabella

La prima stesura di questo report si basava sui file in `supabase/migrations/`, assumendo che descrivessero il database in esercizio. **Non lo descrivono.** Una ricognizione del catalogo di sistema (`scripts/inspect-schema.sql`) e una serie di sonde con la chiave anon hanno mostrato che produzione e migration divergono in entrambe le direzioni: alcune migration non sono mai state applicate, e alcune policy presenti in produzione non compaiono in nessuna migration.

Di conseguenza **tre rilievi classificati Critico nella prima stesura si sono rivelati infondati** (C1, C2, C3), e altri due descrivevano una situazione diversa da quella reale (A3, A5). Sono riportati per intero nella sezione *Rilievi smentiti*, perché il fatto che fossero plausibili e sbagliati è esso stesso il sintomo del problema di fondo: senza uno schema versionato e allineato non è possibile ragionare in modo affidabile sulla sicurezza del sistema.

I rilievi qui sotto sono ora etichettati per **origine della verifica**:

- **[prod]** — verificato sul database di produzione o con una sonda applicativa
- **[codice]** — verificato leggendo il codice sorgente (non richiede il DB)

---

## Stato dei lavori al termine della sessione

| | |
|---|---|
| ✅ **Risolto** | intervento applicato e verificato |
| 🕐 **In attesa di deploy** | correzione scritta, non ancora in produzione |
| ⚠️ **Aperto** | confermato e non affrontato |
| ❌ **Smentito** | non sussiste |

---

## Tabella riassuntiva

| # | Area | Problema | Severità | Stato | Origine |
|---|------|----------|----------|-------|---------|
| **N1** | Vetrina | Vetrina pubblica invisibile: nessuna policy di lettura su `restaurants` | **Critico** | ✅ Risolto (mig. 015) | prod |
| **N2** | Checkout | Ordini e prenotazioni falliti e non salvati (`INSERT … RETURNING` senza policy SELECT) | **Critico** | 🕐 Deploy | prod |
| **N3** | Storage | Path piatti incompatibili con le policy per tenant: upload bloccati | **Alto** | ✅ Risolto | prod |
| **N7** | Segreti | PAT GitHub in chiaro in `.git/config` | **Alto** | ✅ Rimosso — **da revocare** | prod |
| C6 | Pagamenti | Nessun gateway: l'ordine è creato senza alcun addebito | **Critico** | ⚠️ Aperto | codice |
| C7 | Pagamenti | PAN + CVV raccolti in chiaro in un form custom (PCI-DSS) | **Critico** | ⚠️ Aperto | codice |
| C8 | Pagamenti | Prezzi, sconto e totale calcolati dal client e inseriti senza validazione | **Critico** | ⚠️ Aperto | prod |
| C9 | Prenotazioni | Nessun controllo di capienza: overbooking illimitato | **Critico** | ⚠️ Aperto | codice |
| A1 | Auth | Ruolo letto da cookie non-httpOnly scritto dal client | **Alto** | ⚠️ Aperto | codice |
| A2 | Multi-tenant | `my_restaurant_id()` usa `LIMIT 1`: un owner con più locali ne governa uno solo | **Alto** | ⚠️ Aperto | prod |
| A4 | Multi-tenant | Codici sconto attivi enumerabili in anonimo (oggi 0 promo a sistema) | **Alto** | ⚠️ Aperto | prod |
| A6 | Ordini | Tracking per `order_number` con `maybeSingle()`: rotto su collisione fra ristoranti | **Alto** | ⚠️ Aperto | codice |
| A7 | Ordini | `expired` non ammesso dal CHECK: scrittura fallita in silenzio | **Alto** | ✅ Risolto (mig. 016) | prod |
| A8 | Promozioni | `used_count` non incrementa: `max_uses` mai applicato | **Alto** | ⚠️ Aperto | prod |
| A9 | Pagamenti | `stripe_connected`/`paypal_connected` auto-dichiarati | **Alto** | ⚠️ Aperto | codice |
| A10 | Pagamenti | Nessun flusso di rimborso, ma l'email di annullamento lo promette | **Alto** | ⚠️ Aperto | codice |
| A11 | Segreti | Chiave API Resend reale nello storico Git | **Alto** | ⚠️ **Da ruotare** | codice |
| A12 | Auth | `/api/order/send-status-email` senza autenticazione | **Alto** | ⚠️ Aperto | codice |
| A13 | Prenotazioni | Nessuna gestione fusi orari | **Alto** | ⚠️ Aperto | codice |
| A14 | Performance | Zero indici sul database | **Alto** | ✅ Risolto (mig. 016) | prod |
| A15 | Dati | Il wizard cancella e reinserisce tutto il menu ad ogni salvataggio | **Alto** | ⚠️ Aperto | codice |
| C3′ | Multi-tenant | `restaurants` pubblica espone email proprietario e (futuri) dati bancari | Medio | 🕐 Deploy (mig. 017) | prod |
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
| ~~C1~~ | ~~Multi-tenant~~ | ~~`orders`/`order_items` leggibili da chiunque~~ | — | ❌ Smentito | prod |
| ~~C2~~ | ~~Multi-tenant~~ | ~~`bookings` leggibili da chiunque~~ | — | ❌ Smentito | prod |
| ~~C5~~ | ~~Privacy~~ | ~~"I miei ordini" espone lo storico altrui~~ | — | ❌ Smentito | prod |
| ~~A3~~ | ~~Storage~~ | ~~Storage senza separazione per tenant~~ | — | ❌ Smentito | prod |
| ~~A5~~ | ~~Ordini~~ | ~~`order_number` senza UNIQUE~~ | — | ❌ Smentito → vedi N8 | prod |
| **N8** | Ordini | Collisione `order_number` → INSERT rifiutato: il 2° cliente del giorno non ordina | **Alto** | ⚠️ Aperto | prod |

---

## Executive summary

Il progetto è funzionalmente ricco e l'interfaccia è completa. Al momento dell'audit, però, **la piattaforma era inutilizzabile dai clienti finali**: la vetrina pubblica non mostrava nulla a chi non era autenticato, e ordini e prenotazioni fallivano senza essere salvati. Entrambi i problemi erano invisibili dal pannello del ristoratore, che continuava a funzionare perché opera da utente autenticato. Sono stati individuati e corretti nel corso di questa sessione.

Chiusi quelli, restano tre lacune strutturali:

1. **Non esiste alcuna integrazione di pagamento.** Niente Stripe, niente PayPal, nessun webhook, nessuna colonna `payment_status` — verificato sullo schema reale. Il checkout raccoglie PAN e CVV in chiaro, li valida e li scarta: l'ordine viene creato senza che nulla venga addebitato.
2. **Gli importi sono decisi dal client.** `subtotal`, `discount`, `total` e il prezzo di ogni articolo arrivano dal browser e nessuna funzione server li ricalcola. Anche introducendo un gateway, si addebiterebbe la cifra scelta dal cliente.
3. **Le prenotazioni non hanno alcun controllo di capienza.** `tables_count` serve solo a generare i QR code. Nessun vincolo, nessun lock, nessun conteggio: l'overbooking è illimitato.

L'isolamento multi-tenant, che la prima stesura indicava come area critica, **in produzione regge**: le policy per proprietario sono corrette, le API admin verificano il ruolo server-side prima di usare la service role key, e le letture pubbliche indiscriminate ipotizzate non esistono. Il problema reale non è che le RLS siano permissive — è che **nessuno sa con certezza quali siano**, perché lo schema non era versionato e le migration non corrispondono alla produzione.

---

## Rilievi smentiti

Sezione conservata deliberatamente: documenta un errore di metodo utile da ricordare.

### ❌ C1 — `orders` e `order_items` leggibili da chiunque

**Cosa dicevo.** La migration `007_public_order_read.sql` imposta `FOR SELECT USING (true)` su entrambe le tabelle, esponendo anagrafica e storico di tutti i clienti di tutti i ristoranti.

**Realtà.** La migration **non è mai stata applicata**. In produzione `orders` ha quattro policy (`owner read`, `owner update`, `public insert`, `public update expired`) e nessuna lettura pubblica. Sonda con chiave anon: 7 ordini reali in tabella, **0 righe restituite**. Idem per `order_items` (8 righe reali, 0 restituite).

### ❌ C2 — `bookings` leggibili da chiunque

Stessa dinamica: `014_public_booking_read.sql` non è stata applicata. In produzione `bookings` ha solo `owner all` e `public insert`.

### ❌ C5 — "I miei ordini" espone lo storico altrui

Dipendeva interamente da C1. Senza lettura pubblica su `orders`, la funzione non restituisce nulla a un utente anonimo — **è anzi non funzionante**, il che è un difetto diverso e molto minore.

### ❌ A3 — Storage senza separazione per tenant

**Cosa dicevo.** La migration 009 concede INSERT/UPDATE/DELETE a qualunque utente autenticato su tutti i bucket, senza vincolo di percorso.

**Realtà.** In produzione quelle policy sono state sostituite da `tenant storage: owner insert/update/delete`, che verificano
`(storage.foldername(name))[1] = my_restaurant_id()::text OR is_admin()`.
La separazione per tenant **esisteva già** e non compare in nessuna migration. Vedere però N3: era attiva su un'applicazione che scriveva su path piatti, quindi bloccava gli upload invece di limitarli.

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

### 🕐 N2 — Ordini e prenotazioni fallivano senza essere salvati *(corretto, in attesa di deploy)*

**Cosa succedeva.** Il checkout eseguiva `.insert(payload).select().single()`. In PostgreSQL un `INSERT … RETURNING` richiede anche una policy **SELECT** che copra la riga inserita; su `orders` le uniche SELECT sono `owner read` e `is_admin()`, entrambe false per un cliente anonimo.

**Verificato con una sonda** (ordine di prova inserito con chiave anon e rimosso subito dopo):

```
insert().select().single()          → [42501] new row violates row-level security policy
insert()  senza .select()           → OK
insert()  con id generato dal client → OK
```

L'intera istruzione veniva annullata: il cliente vedeva `Errore di rete` **e l'ordine non veniva salvato**, quindi il ristoratore non lo vedeva mai. Ordini persi senza lasciare traccia. Stessa dinamica per le prenotazioni, su entrambi i percorsi ("Solo Tavolo" e prenotazione con pre-ordine).

**Corretto** generando l'id lato client con `crypto.randomUUID()` e rimuovendo il `.select()`, in tutti e tre i punti di inserimento.

### ✅ N3 — I path piatti bloccavano gli upload *(risolto)*

Le policy per tenant di N-A3 richiedono che il primo segmento del percorso sia il `restaurantId`. Per un oggetto nella radice del bucket `storage.foldername()` non restituisce alcun segmento, quindi la condizione era sempre falsa: **ogni upload su path piatto veniva rifiutato**, admin compreso.

**Ipotesi coerente con i dati, non dimostrata:** è la ragione per cui il bucket `dish-images` è vuoto e **159 `menu_items` su 159 non hanno immagine**. Logo e banner esistenti stanno su path piatti, quindi risalgono a prima che le policy per tenant fossero introdotte.

**Risolto**: gli upload di logo e banner scrivono ora sotto `<restaurantId>/` (le immagini piatto lo facevano già), e `scripts/migrate-storage-to-tenant-folders.js` ha spostato i 2 oggetti esistenti aggiornando i riferimenti in `restaurants`.

### ⚠️ N8 — Collisione di `order_number`: il secondo cliente del giorno non riesce a ordinare

`generateId()` costruisce il numero d'ordine da un contatore in `localStorage`, che riparte da `0001` su **ogni dispositivo**. In produzione esiste `UNIQUE (restaurant_id, order_number)`.

Due clienti dello stesso ristorante, stesso giorno, browser diversi generano entrambi `ORD-ggmm-0001`: il secondo INSERT viola il vincolo e fallisce. Non è un caso limite, è il funzionamento normale a partire dal secondo ordine giornaliero.

Il vincolo è per ristorante, quindi numeri identici fra ristoranti diversi restano possibili e **A6 resta valido**: il tracking cerca con `.eq('order_number', …).maybeSingle()`, che va in errore quando le righe sono più d'una, e l'errore è gestito senza mostrare nulla all'utente.

**Non affrontato.** La correzione è generare il numero lato database con una sequenza per ristorante.

### ✅ N7 — PAT GitHub in chiaro *(rimosso, da revocare)*

Il remote `origin` conteneva un Personal Access Token classico nell'URL, in chiaro in `.git/config`. Rimosso con `git remote set-url`; Git Credential Manager era già configurato, quindi l'autenticazione continua a funzionare.

**Il token resta valido finché non viene revocato** su github.com/settings/tokens: rimuoverlo dalla configurazione locale non lo invalida.

### ⚠️ N4 · N5 · N6 — Divergenze minori fra migration e produzione

- `loyalty_points` è creata dalla migration 001 ma **non esiste** in produzione.
- Esiste un bucket `menu-images` che nessuna migration crea e che nessun codice usa.
- Realtime è attivo su tutte e 11 le tabelle; la migration 005 ne prevedeva due (`orders`, `bookings`). Le RLS restano applicate anche via Realtime, quindi non è un'esposizione, ma è più ampio del previsto.

---

## Rilievi confermati — dettaglio

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

### C3′ — Lettura pubblica di `restaurants` per riga intera *(Medio, in attesa di deploy)*

Riformulazione di C3 alla luce dei fatti. La policy pubblica **non era presente** (da cui N1) ed è stata **reintrodotta dalla migration 015** perché senza di essa la vetrina non funziona. Le RLS filtrano righe e non colonne, quindi la riga è ora leggibile per intero.

Oggi l'esposizione concreta è limitata a `restaurants.email` (indirizzo personale del proprietario) e `owner_id`: `vat_number`, `online_payment_account`, `iban_holder`, `paypal_email` e `stripe_account_label` sono **tutti NULL**. Diventeranno pubblici nel momento in cui un ristoratore compilerà l'IBAN dalla pagina Pagamenti.

La migration 017 chiude il problema con `REVOKE` di tabella più `GRANT` delle sole colonne ammesse, e richiede il deploy della select esplicita in `useRestaurantSettings.ts` (già scritta).

> **Nota su un errore da non ripetere.** La prima stesura della 017 usava solo una `REVOKE` per colonna. In PostgreSQL una revoca per-colonna non sottrae nulla a una concessione per-tabella, e Supabase assegna ad `anon` un `GRANT SELECT` sull'intera tabella: la migration è passata **senza errori e senza alcun effetto**. È il motivo per cui il file contiene ora una sezione di verifica esplicita — l'assenza di errori non è prova che una restrizione sia attiva.

### A2 · A4 · A6 · A8 · A9 · A10 · A12 · A13 · A15 — invariati

Confermati come nella prima stesura. In particolare, verificati sul DB:

- **A2** — `my_restaurant_id()` ha ancora `LIMIT 1` senza `ORDER BY`: la piattaforma supporta di fatto un solo ristorante per account.
- **A4** — `promos: public read active` è presente e consente di enumerare i codici sconto attivi di tutti i ristoranti pubblicati. Oggi latente: 0 promo a sistema.
- **A8** — `used_count` viene aggiornato dal client, ma l'unica policy di scrittura su `promos` è per proprietario: per l'anonimo la UPDATE tocca **zero righe senza errore**, e l'esito non è controllato. `max_uses` non viene mai applicato.

### A7 · A14 — confermati e risolti

- **A7** — il CHECK su `orders.status` ammetteva sette valori, senza `expired`, mentre `triggerExpired()` lo scrive: l'UPDATE falliva e l'errore finiva solo in `console.error`. Il sintomo era mascherato da `LiveOrderKanban`, che ricalcola lo stato "scaduto" a runtime dal timestamp. **Risolto dalla migration 016**, che estende il CHECK.
- **A14** — indici non-PK/UNIQUE su tutto lo schema `public`: **0**. **Risolto dalla migration 016**, che ne crea 13 sui percorsi di accesso realmente usati dal codice.

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
- [x] Corretto il checkout: ordini e prenotazioni tornano a salvarsi *(richiede deploy)*
- [x] Upload storage allineati alle policy per tenant, oggetti esistenti migrati
- [x] `expired` ammesso dal CHECK, 13 indici creati (mig. 016)
- [x] Schema Supabase riportato sotto versionamento
- [x] PAT GitHub rimosso dalla configurazione locale

### Blocco 1 — Chiudere le esposizioni residue

- [ ] **Revocare il PAT GitHub** su github.com/settings/tokens (rimuoverlo dal remote non lo invalida)
- [ ] **Revocare e ruotare la chiave Resend** presente nello storico Git
- [ ] Applicare la migration 017 dopo il deploy, e **verificare** che la restrizione sia attiva
- [ ] Autenticare `/api/ristoratore/register` con un token monouso a scadenza
- [ ] Portare il ruolo utente fuori dal cookie client-side
- [ ] Autenticare `/api/order/send-status-email`; rate limit sugli endpoint pubblici
- [ ] Riconciliare le migration 001-014 con lo schema reale e correggerle

### Blocco 2 — Integrità dei dati d'ordine

- [ ] Ricalcolare importi e prezzi **lato server** a partire da `menu_items.price`, ignorando quanto inviato dal client
- [ ] Generare `order_number` lato database con una sequenza per ristorante (chiude N8 e A6)
- [ ] Unificare il vocabolario degli stati fra CHECK, Kanban, tracking ed email
- [ ] Incrementare `promos.used_count` in modo atomico e far rispettare `max_uses`
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

`scripts/inspect-schema.sql` è in repo proprio per questo: rieseguirlo periodicamente e confrontarlo con le migration è il modo più economico per accorgersi in tempo della prossima deriva.
