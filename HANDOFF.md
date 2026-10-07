# Handoff — stato del progetto dopo le sessioni di audit

**Aggiornato:** 7 ottobre 2026 · **Riferimento:** `main`, release `v1.37.0` (tag `v1.36.2` è l'ultima già pubblicata prima di questo aggiornamento). Il codice dell'audit è in `ff609ac` (22 set) e `6d044c3`…`819190d` (25 set); i pagamenti e la regola di accettazione sono nelle release 1.31.0–1.37.0 (2–7 ott)
**Da leggere insieme a:** `AUDIT_REPORT.md`

> **L'audit non è più di sola lettura.** Il prompt iniziale chiedeva una diagnosi
> senza modifiche. Quella fase è conclusa da tempo: i rilievi marcati ✅ nel
> report sono stati corretti, cinque migration (015–018 e 020) sono applicate in
> produzione e tutto il codice è committato su `main` (verificabile con
> `git log`). Chi riprende il lavoro deve partire da qui, non dal commit
> iniziale `c144d72`.

Il lavoro si è svolto in **tre fasi**. La prima (22–23 settembre) ha
ripristinato il servizio: vetrina invisibile e checkout che perdeva gli ordini.
La seconda (25 settembre, poi il 30 settembre e i primi di ottobre) ha chiuso una
classe di difetti che la prima aveva solo sfiorato — le operazioni che RLS scarta
in silenzio — più i buchi di autenticazione sulle route e il calcolo dei prezzi
lato server. La terza (2–7 ottobre) ha costruito i **pagamenti online** (Stripe
Connect) e, provandoli, ha portato alla luce che il timer di 3 minuti non
scattava per nessun ordine: oggi c'è **una sola regola di accettazione** per
ordini e prenotazioni (vedi le decisioni 16–22).

---

## Il fatto che ha ribaltato l'audit

La prima stesura del report si basava sui file in `supabase/migrations/`, dando
per scontato che descrivessero il database in esercizio. **Non lo descrivevano.**

Da lì, tre conseguenze:

- **Due guasti reali e gravi non erano visibili dal codice**, perché il codice
  era corretto rispetto alle migration: la vetrina pubblica era invisibile agli
  utenti anonimi e il checkout perdeva gli ordini senza salvarli.
- **Tre rilievi sono stati dichiarati infondati per errore** (C1 e C2, Critici;
  A3, Alto): erano problemi reali, chiusi da un intervento manuale diretto sul
  database che non ha lasciato alcun record formale. Non trovarne traccia non
  significava che non fossero mai esistiti.
- **Due rilievi erano effettivamente infondati o derivati** (C5, A5). Sono i
  soli due rimasti nella sezione *Rilievi smentiti*.

**C3 è un caso a sé, e non va contato fra gli smentiti.** Non è stato smentito
ma riformulato in **C3′**, ed è risolto dalla migration 017. La policy che
espone la riga intera di `restaurants` — email del proprietario e, quando
saranno compilati, IBAN e P.IVA — risultava assente all'ispezione, e quella
assenza era essa stessa il guasto N1. La migration 015 l'ha dovuta
**reintrodurre**, perché senza la vetrina non funziona, rendendo l'esposizione
concreta; la 017 l'ha chiusa con `REVOKE` di tabella e `GRANT` per colonna,
verificato con la chiave anon (`select('*')` → `permission denied`).

> **Il punto di metodo, in una riga.** L'assenza di un intervento dalla
> cronologia delle migration prova solo che manca il record dell'intervento,
> non che il problema non sia mai esistito. `query.csv` è una fotografia dello
> stato al 22 settembre, non una cronologia: non può distinguere i due casi.

Morale operativa: **su questo progetto non si conclude nulla sulla sicurezza o
sul comportamento leggendo solo il sorgente.** Va verificato sul database.
`scripts/inspect-schema.sql` esiste per questo — è di sola lettura, si incolla
nel SQL Editor di Supabase e si riesegue quando serve.

La deriva continua in entrambe le direzioni: `restaurants.activation_token` e
`activation_token_expires_at` erano in produzione e in nessuna migration, finché
la 019 non le ha versionate.

---

## Il difetto ricorrente di questo progetto

Vale la pena isolarlo, perché è **una classe di difetto e non una serie di
incidenti**. Quattro rilievi della seconda tornata avevano la stessa causa.

PostgreSQL non distingue *"non esiste"* da *"non ti è permesso vederlo"*. Con RLS
attiva, una riga filtrata semplicemente non compare. PostgREST traduce entrambi i
casi nello stesso modo:

| Operazione | Cosa torna quando RLS filtra |
|---|---|
| `select().maybeSingle()` | `data: null`, **`error: null`** |
| `select('*', {count:'exact'})` | `count: 0`, **`error: null`** |
| `select()` | `data: []`, **`error: null`** |
| `update()` senza `.select()` | HTTP **204**, `error: null`, zero righe toccate |
| `update().select()` | `data: []`, `error: null` |
| canale Realtime | si sottoscrive e **non consegna mai un evento** |

Nessun `catch` scatta, nessun log si popola. Ogni punto che legge o scrive
`orders`, `bookings` o `promos` con la chiave anon e interpreta il vuoto come
stato legittimo è un guasto silenzioso in attesa.

**Il rimedio adottato è sempre lo stesso:** spostare l'operazione dietro una
funzione `SECURITY DEFINER` o una route con service role key, e farle restituire
un esito esplicito — un boolean, un conteggio, un 404 — che il chiamante non
possa confondere con un risultato vuoto.

**Come si verifica:** agire con la chiave anon, poi **rileggere con la service
role key** e confrontare. Leggere il codice non basta: tre dei rilievi chiusi
avevano codice all'apparenza corretto — l'`await` c'era, il `catch` c'era,
l'`error` veniva controllato — e non facevano nulla.

Quattro punti dello stesso tipo restano aperti: sono censiti in **N13**.

---

## Stato della produzione

| Area | Stato |
|---|---|
| Vetrina pubblica `/menu/[slug]` | ✅ visibile agli anonimi |
| Checkout e prenotazioni | ✅ funzionanti, creati lato server con importi ricalcolati (C8) |
| Colonne sensibili di `restaurants` | ✅ non leggibili da `anon` |
| Indici database | ✅ 13 |
| Storage per tenant | ✅ path annidati, oggetti migrati |
| PAT GitHub e chiave Resend | ✅ revocati e ruotati |
| Pagina di tracking ordine | ✅ funzionante, legge da route server-side |
| Scadenza ordine non confermato | ✅ decisa e registrata dal server per ordini e prenotazioni (regola unica, mig. 034) |
| Limite utilizzi codici promo | ✅ applicato, anche con checkout concorrenti |
| Promo "primo ordine" | ✅ non più riutilizzabile |
| Attivazione ristoratore | ✅ token monouso a scadenza |
| `send-status-email` | ✅ richiede sessione ristoratore o admin |
| Pagamenti online | ✅ Stripe Connect (direct charges), carta autorizzata e poi incassata all'accettazione; **provati solo in modalità test** |
| Scarto automatico delle autorizzazioni | ✅ job `pg_cron` + `pg_net` ogni minuto (`scripts/cron-expire-authorizations.sql`, eseguito a mano) |
| Prenotazioni | ✅ capienza controllata dal database; scadono se non confermate (mig. 034) |
| Notifiche all'utente | ✅ toast e finestre di conferma proprie (`src/lib/notify.ts`), niente `alert()` nativi |

**Migration applicate:** 015, 016, 017, 018, 020–034. La **019 non va eseguita**:
versiona colonne che in produzione esistono già. La **035 è scritta e da
applicare** prima del deploy che la presuppone (chiude N23).

| Migration | Contenuto |
|---|---|
| 028–029 | base dei pagamenti: colonne su `restaurants` e `orders`, `stripe_events`, trigger di guardia |
| 030–031 | ciclo di vita dell'ordine online: scadenza a 30 minuti degli ordini non pagati, job `pg_cron` |
| 032 | autorizzazione e cattura separate: `authorized_at`, `accept_deadline`, stati `authorized` e `voided` |
| 033 | `restaurants.description_en` (descrizione in inglese, facoltativa) |
| 034 | regola unica di accettazione: `acceptance_mode`, `accept_deadline` su ordini **e prenotazioni**, stato `expired` per le prenotazioni |
| 035 | un ordine online non incassato non entra in preparazione dal browser |

La 020 (30 settembre) toglie ad `anon` gli INSERT diretti su ordini e
prenotazioni. Da qui in poi la vetrina scrive solo tramite `/api/orders` e
`/api/bookings`: un nuovo flusso pubblico che scrive nel database va fatto
passare da una route server, non da una nuova policy anonima.

---

## Le decisioni non ovvie, e perché

Sono i punti dove il codice sembra strano se non si conosce il motivo. Toccarli
senza sapere il perché rimette in produzione un guasto.

**1. La vetrina non scrive mai `orders`, `order_items` o `bookings`: passa da `/api/orders` e `/api/bookings`.**
Dal 30 settembre 2026 (C8). Il browser invia id dei piatti, quantità, le
opzioni scelte (nome e prezzo) e il totale che il cliente ha visto; la route
ricalcola tutto dal database — `menu_items.price` e `menu_items.option_groups`
— e rifiuta l'ordine (409) se un'opzione non esiste con quel prezzo o se il
totale non coincide. *Non reintrodurre un INSERT dal client, e non accettare
importi dal body della richiesta se non come chiave di ricerca.*

**Attenzione a una trappola già costata una regressione:** la personalizzazione
dei piatti è in `src/components/menu/ProductDetailSheet.tsx`. In
`menu/[slug]/page.tsx` c'era un secondo componente, `CustomizationView`, con un
listino di extra generico e *mai montato*: prenderlo per quello vero ha fatto
rifiutare per qualche ora tutti gli ordini con opzioni. È stato rimosso.

Storia utile: prima di C8 l'insert era anonimo, e il pattern
`insert(payload).select().single()` falliva sempre, perché un `INSERT …
RETURNING` richiede anche una policy SELECT che copra la riga (N2). Il problema
non si pone più per la vetrina, ma vale per qualunque nuova scrittura anonima.

**2. `useRestaurantSettings` usa un elenco esplicito di colonne, non `select('*')`.**
La migration 017 revoca ad `anon` il permesso su 7 colonne di `restaurants`.
PostgREST traduce `select('*')` in `SELECT *`, che PostgreSQL espande su tutte le
colonne: senza privilegio su una sola, l'intera query fallisce. *Ogni colonna
aggiunta alla select va aggiunta anche alla `GRANT` della 017, e viceversa* —
**con l'eccezione del punto 9.**

**3. La 017 fa `REVOKE` di tabella e poi `GRANT` di colonne, non una `REVOKE` per colonna.**
La prima stesura usava solo la seconda forma ed è stata **un no-op silenzioso**:
in PostgreSQL una revoca per colonna non sottrae nulla a una concessione per
tabella, e Supabase assegna ad `anon` un `GRANT SELECT` sull'intera tabella.
Nessun errore, nessun effetto. *L'assenza di errori non è prova che una
restrizione sia attiva: verificare con la sezione `PRIVILEGI_anon`.*

**4. Le migration 007 e 014 sono svuotate, non cancellate.**
Descrivono le policy che aprivano `orders`, `order_items` e `bookings` in lettura
anonima: i rilievi C1 e C2, che erano **problemi reali**, rimossi dal database con
un `DROP POLICY` manuale. I file però restavano nella sequenza, e chiunque
allestisse un ambiente nuovo eseguendola in ordine le avrebbe ricreate, riaprendo
le due falle. Contenuto sostituito da `SELECT 1;` con la spiegazione in testa; i
file restano per non alterare la numerazione.
*Non "ripristinarle" pensando che siano state svuotate per errore.*

**5. Gli upload di storage vanno sotto `<restaurantId>/`.**
Le policy di storage in produzione richiedono che il primo segmento del path sia
il `restaurantId`. Per un file nella radice del bucket `storage.foldername()` non
restituisce alcun segmento, quindi **ogni upload su path piatto veniva rifiutato**.
È la spiegazione più coerente del perché 159 `menu_items` su 159 non hanno
immagine. Nel wizard admin l'UUID del ristorante è generato prima dell'insert
proprio per poter costruire il path.

**6. Le scritture pubbliche passano da RPC `SECURITY DEFINER` o da route server, non da UPDATE diretti.**
`expire_order()` e `increment_promo_usage()` (migration 018) esistono perché gli
UPDATE anonimi equivalenti venivano scartati in silenzio. Dalla migration 020
`increment_promo_usage` è eseguibile solo dalla service role, cioè da
`/api/orders`. Entrambe **restituiscono
un boolean** che dice se hanno davvero toccato una riga, e il chiamante lo deve
usare. *Non sostituirle con un `supabase.from(...).update(...)`: sembrerebbe
funzionare e non farebbe nulla.*

**7. `increment_promo_usage` fa controllo e incremento in un solo UPDATE.**
`WHERE max_uses IS NULL OR max_uses <= 0 OR used_count < max_uses`. Non è stile:
leggere e riscrivere in due passaggi non reggerebbe a due checkout concorrenti
sull'ultimo utilizzo disponibile. *Non spezzarla in una SELECT seguita da una
UPDATE.* Il consumo avviene **prima** dell'insert dell'ordine, perché dopo l'ordine
sarebbe già scritto con lo sconto e non resterebbe nulla da non-applicare.

**8. Il tracking cerca per UUID, mai per `order_number`.**
`order_number` è corto e sequenziale per ristorante, quindi enumerabile: chiunque
poteva indovinare il link di tracking altrui. Resta visualizzato come riferimento
leggibile per il cliente, ma *non deve tornare a essere chiave di lookup in
nessuna query o route.* Questo è anche ciò che chiude A6.

**9. `activation_token` non va MAI aggiunto a una select lato client.**
È l'unica credenziale del link di attivazione: chi lo legge può rivendicare
l'account del ristorante. Nasce illeggibile con la chiave anon perché la 017
concede per colonna e una colonna nuova non entra nella concessione. *È l'unica
eccezione alla regola del punto 2: non aggiungerlo né alla `GRANT` della 017 né a
`useRestaurantSettings`.* Le sole letture ammesse sono con service role key nelle
tre route di attivazione.

**10. Il Realtime anonimo non funziona, ed è per questo che c'è il polling.**
I `postgres_changes` passano anch'essi da RLS: sulla vetrina il canale si
sottoscrive con successo e non riceve mai nulla. La pagina di tracking e il
tracker in-pagina fanno polling su `/api/order-status/[orderId]`. *Non
"semplificare" tornando al Realtime: è lo stesso bug in forma diversa.*

**11. `usePromoCode` nega la promo se la RPC fallisce, non la concede.**
Fail closed deliberato: lasciarla passare renderebbe un guasto della RPC il nuovo
modo di aggirare la verifica, cioè lo stesso difetto con un innesco diverso. Il
controllo copre anche `error: null` con `data` non numerico.

**12. Il tag di log `[register][ORPHAN_AUTH_USER]` va preso sul serio.**
Segnala un utente Auth rimasto orfano da un rollback fallito in
`/api/ristoratore/register`. Finché non viene rimosso **a mano**, nessuna
attivazione di quel ristorante può riuscire, nemmeno con un token nuovo: il
ristoratore riceve "already registered" e il pannello admin mostra il locale come
"non ancora attivato". Nessuna pulizia è automatica, di proposito.


**13. Orari e preavvisi stanno in `src/lib/serviceHours.ts`, usato da vetrina e server.**
Non duplicare quella logica e non confrontare orari come stringhe: con una
chiusura a mezzanotte (`"00:00"`), `"20:00" <= "00:00"` è falso e il locale
risulta chiuso per tutta la sera. Il pannello salva le unità del preavviso in
italiano (`"ore"`, `"minuti"`). `/api/orders` valuta gli orari sull'ora di
Roma con 15 minuti di tolleranza; gli ordini al tavolo sono esclusi.

**14. La vetrina legge i ristoranti da `restaurants_public`, non da `restaurants`.**
Sulla tabella un utente loggato vede solo il proprio locale (migration 027):
leggere da lì farebbe sparire la vetrina a un ristoratore che apre il locale di
un altro. La vista è il confine di ciò che è pubblico: *ogni colonna aggiunta
alla vista diventa leggibile da chiunque.* Le policy pubbliche delle tabelle
collegate usano `is_published_restaurant()`; una nuova tabella pubblica deve
fare lo stesso, non una sottoquery su `restaurants`.

**15. Registrazione pubblica di Supabase disattivata, e deve restarlo.**
Con la registrazione aperta chiunque otteneva una sessione autenticata (N17).
Gli account dei ristoratori nascono solo da `auth.admin.createUser` nelle route
server. Il token di attivazione sta in `restaurant_activation_tokens`, leggibile
solo dal server; il consumo passa da `claim_restaurant()`.

**16. I pagamenti sono autorizzati prima e incassati all'accettazione (`capture_method: manual`).**
Il cliente autorizza l'importo, il ristorante ha una finestra per accettare; accettato → `/api/order/accept` cattura, rifiutato o scaduto → l'autorizzazione viene annullata e il cliente non è mai addebitato. Un solo timer per ogni metodo, nessun rimborso nei casi di rifiuto e scadenza, nessuna commissione Stripe persa. Il prezzo: il Payment Element mostra solo i metodi che supportano la cattura manuale. *Non tornare alla cattura automatica per "semplificare": riporta rimborsi, commissioni perse e un timer diverso per la carta.*

**17. Ogni ristorante incassa sul proprio account Stripe (direct charges), la piattaforma non tocca i fondi.**
I `PaymentIntent` si creano **sull'account del ristorante** (`{ stripeAccount }`), non su quello di InnovaGo. Le colonne `stripe_*` di `restaurants` e le colonne di pagamento di `orders` le scrive solo il server (trigger 028 → 035). *Un nuovo flusso che tocca denaro passa dal server: mai una policy che lascia scrivere il browser.*

**18. La regola di accettazione è una sola ed è decisa dal server (`src/lib/acceptance.ts`).**
Locale aperto quando il cliente ordina → `live`: 3 minuti, timer visibile, **qualunque orario abbia scelto** per il ritiro o la consegna. Locale chiuso → `deferred` (preordine): niente timer, scadenza **un'ora dopo la prossima apertura**. Vale per asporto, domicilio, tavolo e prenotazioni, con contanti, POS e carta; gli ordini al tavolo sono sempre `live`. *Non distinguere "programmato" dalla presenza di `scheduled_at`: nel checkout "il prima possibile" è disattivato (`showAsapOption = false`), quindi tutti gli ordini hanno un orario. È l'errore che per giorni ha tolto il timer a ogni ordine (N19).* La scadenza (`accept_deadline`) per la carta nasce all'autorizzazione (webhook), per contanti/POS alla creazione.

**19. La scadenza la registra il server, mai il browser.**
Il tracker del cliente, il pannello e il cron leggono lo stesso `accept_deadline`. Quando il timer arriva a zero il browser **chiede lo stato** a `/api/order-status` e mostra quello vero: se il ristoratore ha accettato all'ultimo secondo, il cliente vede "confermato", non "scaduto". Chi rileva la scadenza (`/api/order-status`, `/api/order/expire-due` chiamata dai pannelli, `/api/cron/expire-authorizations`) la registra con `expireOrder` / `expireBooking` in `src/lib/orderPayments.ts`, che per la carta annulla prima l'autorizzazione su Stripe. La RPC `expire_order` resta nel database ma l'applicazione non la usa più.

**20. Il job di scarto è un `pg_cron` che chiama una route, eseguito a mano e con un segreto.**
`scripts/cron-expire-authorizations.sql` non è una migration perché contiene `CRON_SECRET`: nel repository c'è il segnaposto `REPLACE_WITH_CRON_SECRET`. *Non committare mai lo script con il segreto vero.* Senza il job, un'autorizzazione resta bloccata sulla carta finché qualcuno non apre un pannello o un tracking (fino a circa 7 giorni). La route risponde 503 se `CRON_SECRET` manca e 401 se non coincide.

**21. Le righe di un ordine si leggono da `order_items`, con colonne snake_case.**
`added_ingredients` è un elenco di `{ name, price }`, non di stringhe. Il prezzo di una riga (`price`) è il **prezzo unitario comprensivo dei supplementi**: non sommare di nuovo i supplementi (era N21). In `LiveOrderKanban.tsx` la funzione `orderLines` normalizza le righe per schede, dettaglio e stampe. Ogni supplemento a pagamento va mostrato con il prezzo.

**22. Notifiche e conferme passano da `src/lib/notify.ts`.**
`notify.success/error/info` e `confirmAction` (finestra di conferma con pulsante rosso per le azioni distruttive), montati una volta nel layout (`NotifyHost`, libreria `sonner`). *Niente `alert()` né `confirm()` nativi: mostrano "app.… dice" e sembrano un prodotto non curato.* La "X" per rimuovere un chip è `RemoveBadge`; i pulsanti con icona non vogliono un "+" scritto a mano nel testo.

---

## Cosa è cambiato nel codice

### Prima tornata (22–23 settembre)

| File | Modifica |
|---|---|
| `src/app/menu/[slug]/page.tsx` | id client-side + rimozione `.select()` nei 3 punti di inserimento |
| `src/hooks/useRestaurantSettings.ts` | select esplicita; rimossi i mapping dei campi sensibili |
| `src/app/admin/restaurants/new/page.tsx` | UUID pre-generato, path upload annidati, insert con id esplicito |
| `src/app/admin/restaurants/[id]/configure/page.tsx` | path upload annidati |
| `supabase/migrations/015…017` | ripristino vetrina · `expired` + 13 indici · restrizione colonne |
| `supabase/migrations/007, 014` | neutralizzate |
| `scripts/inspect-schema.sql` | ricognizione schema, sola lettura, rieseguibile |
| `scripts/migrate-storage-to-tenant-folders.js` | one-shot, **già eseguito**, dry-run di default |

### Seconda tornata (25 settembre)

| File | Modifica |
|---|---|
| `supabase/migrations/018_client_side_rls_writes.sql` | `expire_order()` e `increment_promo_usage()` — **applicata** |
| `supabase/migrations/019_activation_token.sql` | versiona le colonne del token — **da NON eseguire** |
| `src/app/menu/[slug]/page.tsx` | scadenza via RPC con stato reale sul falso; consumo promo prima dell'insert |
| `src/hooks/usePromoCode.ts` | `first_order` via `count_customer_orders`, fail closed |
| `src/app/api/order-status/[orderId]/route.ts` | risposta estesa, lookup per UUID, validazione del formato |
| `src/app/ordine/tracking/OrderTrackingContent.tsx` | fetch server-side, polling al posto del Realtime, errore visibile |
| `src/app/ordine/successo/OrderSuccessContent.tsx` | link di tracking per UUID |
| `src/app/api/order/send-status-email/route.ts` | sessione + ruolo + proprietà dell'ordine |
| `src/lib/activationToken.ts` | emissione del token, TTL 7 giorni, messaggio d'errore unico |
| `src/app/api/admin/activation-link/route.ts` | **nuova** — emette il link senza inviare email |
| `src/app/api/admin/send-activation-email/route.ts` | genera e salva il token prima di comporre il link |
| `src/app/api/ristoratore/register/route.ts` | solo token, consumo atomico, diagnosi degli orfani |
| `src/app/register/page.tsx` | legge `token` dall'URL; l'email è sola conferma visiva |
| `src/app/admin/restaurants/page.tsx` | i pulsanti "Copia link" chiamano la route |
| `src/components/admin/restaurant-wizard/PublishedSuccess.tsx` | riceve il link come prop |
| `src/app/ristoratore/prenotazioni/page.tsx` | `order_number` dalla sequenza del database |

### Terza tornata (30 settembre) — C8

| File | Modifica |
|---|---|
| `src/lib/pricing.ts` | **nuovo** — centesimi e regole dello sconto |
| `src/lib/orderServer.ts` | **nuovo** — validazione del carrello e prezzatura dal database, opzioni comprese |
| `src/app/api/orders/route.ts` | **nuova** — crea l'ordine ricalcolando ogni importo; 409 se il totale mostrato non coincide |
| `src/app/api/bookings/route.ts` | **nuova** — crea la prenotazione, pre-ordine prezzato dal database |
| `src/app/menu/[slug]/page.tsx` | checkout e "Solo Tavolo" chiamano le route; rimosse le zone di consegna di esempio |
| `supabase/migrations/020_server_side_checkout.sql` | toglie ad `anon` gli INSERT diretti — **applicata** dopo il deploy |

### Quarta fase (2–7 ottobre) — pagamenti e regola di accettazione

| File | Modifica |
|---|---|
| `supabase/migrations/028…035` | vedi la tabella delle migration sopra |
| `src/lib/stripeServer.ts` | **nuovo** — client Stripe, sincronizzazione dello stato dell'account, contesto di autenticazione delle route |
| `src/app/api/stripe/connect`, `status` | **nuove** — creazione dell'account e apertura della procedura Stripe; stato letto da Stripe |
| `src/app/api/stripe/webhook/route.ts` | **nuova** — firma verificata, idempotenza (`stripe_events`), autorizzazione, incasso, annullamento, rimborso, `account.updated` |
| `src/app/api/orders/route.ts` | `capture_method: manual`; calcola `acceptance_mode` e `accept_deadline`; fa scadere le richieste in ritardo |
| `src/app/api/order/accept`, `cancel`, `expire-due` | **nuove / riscritte** — cattura all'accettazione; annullamento dell'autorizzazione o rimborso; scadenza chiamata dai pannelli |
| `src/app/api/cron/expire-authorizations/route.ts` | **nuova** — scarto di ordini e prenotazioni scaduti, protetta da `CRON_SECRET` |
| `src/lib/acceptance.ts` | **nuovo** — `decideAcceptance`, costanti 3 minuti / 1 ora / 6 giorni |
| `src/lib/orderPayments.ts` | **nuovo** — `cancelAuthorization`, `expireOrder`, `expireBooking`, `expireDueRequests` |
| `src/lib/serviceHours.ts` | `nextOpeningAt`, `zonedToUtc`, servizio `reservation` |
| `src/components/menu/StripePayment.tsx` | **nuovo** — Payment Element |
| `src/components/menu/BookingStatusNotice.tsx` | **nuovo** — timer o scadenza e esito di una prenotazione di solo tavolo |
| `src/app/menu/[slug]/page.tsx` | tracker con timer dalla scadenza del server, "Riordina", ricevuta corretta, barra del tavolo fissa in cima |
| `src/components/ristoratore/LiveOrderKanban.tsx` | `orderLines`, "Accetta entro mm:ss", azioni sugli ordini scaduti, scarto periodico |
| `src/app/ristoratore/prenotazioni/page.tsx` | prenotazioni "Scadute" e scadenza per confermare |
| `src/lib/notify.ts`, `src/components/ui/NotifyHost.tsx`, `RemoveBadge.tsx` | **nuovi** — notifiche, conferme, pulsante di rimozione |
| `scripts/cron-expire-authorizations.sql` | job `pg_cron` (da eseguire a mano, segnaposto per il segreto) |
| `scripts/db-tables-overview.sql`, `scripts/db-clean-test-data.sql` | elenco delle tabelle con righe; pulizia dei dati di collaudo |

> **Attenzione operativa.** Ogni emissione di un link di attivazione **ruota il
> token**: premere "Copia link attivazione" invalida il link già spedito per
> email. È corretto per un monouso, ma cambia l'abitudine di lavoro.

---

## Cosa resta aperto, in ordine di gravità

**1. Mettere i pagamenti in produzione (live).** Funzionano in modalità test:
accettazione, rifiuto e scadenza sono stati collaudati, e il job di scarto
risponde. Prima del primo incasso reale servono: l'endpoint webhook Connect in
live con tutti gli eventi e il suo segreto, le chiavi live su Vercel, un ristorante
vero collegato, un ordine reale da pochi euro con rimborso, e la prova a pannello
chiuso (ordine non accettato → su Stripe "Annullato", nel database `expired` /
`voided`). Checklist completa: Blocco 7 di `AUDIT_REPORT.md`.

> **Ordine di rilascio da ricordare.** Ogni migration che aggiunge colonne va
> applicata **prima** del deploy del codice che le scrive: la 034 e la 035 non
> fanno eccezione. Con il codice nuovo e il database vecchio gli ordini danno 500.

**1b. Rimasti sui pagamenti:** PayPal (non integrato), rimborsi parziali dal
pannello, contestazioni (`charge.dispute.created` è solo registrata nei log), e i
metodi di pagamento che non supportano la cattura manuale. Se un ristoratore
chiede Satispay o PayPal, vanno valutati a parte.

**1c. Prenotazioni.** Gli slot già passati della giornata corrente sono ancora
prenotabili (M3, nella vetrina e in `/api/bookings`) e gli orari non usano un
fuso per ristorante (A13). La conferma al cliente per email non c'è per le
prenotazioni.

**2. Capienza prenotazioni** (C9): chiuso il 2 ottobre con la migration 022.
Resta da fare, quando servirà: i tavoli come entità (piantina, abbinamento
tavolo-gruppo). Ogni ristoratore deve impostare la propria capienza dalla
pagina Prenotazioni: finché è vuota non c'è limite automatico.

**3. Quattro punti con lo stesso difetto silenzioso** (N13). Il più urgente è
`loadHistoryOrders` in `menu/[slug]/page.tsx`, la modale "I miei ordini": stessa
dinamica della promo `first_order`, verosimilmente **già non funzionante in
produzione**. Gli altri tre sono latenti ma fragili.

**4. Rate limit** (M4): attivo dal 1 ottobre su `/api/orders` e
`/api/bookings`, per IP e ristorante (migration 021). Le soglie sono costanti
nelle due route: un ristorante molto grande che ordina dal QR sul proprio
Wi-Fi potrebbe richiedere di alzarle.

**5. Compensazione mancante su `used_count`.** Se l'insert dell'ordine fallisce
subito dopo l'incremento, quell'utilizzo di promo resta consumato a vuoto.
Preferibile a regalare sconti illimitati, ma andrà chiuso.

**6. Nessuna suite di test.** Nessuno dei guasti trovati dal 22 settembre
sarebbe stato intercettato automaticamente, e nemmeno N19 (il timer che non
scattava). La regola di accettazione (`acceptance.ts`) è la prima candidata:
funzioni pure, con casi già verificati a mano (aperto, chiuso fra pranzo e cena,
dopo la cena, giorno di chiusura, cambio all'ora solare). Le verifiche fatte finora — sonde
con chiave anon e service role, giri del checkout in Chrome con la richiesta
intercettata, ristoranti di prova creati e cancellati — sono la base naturale
per scriverne una. (A1, il ruolo nel cookie, è chiuso dal 2 ottobre.)

Il quadro completo — 37 rilievi risolti (3 dei quali chiusi fuori migration), 20
aperti, 2 smentiti — è in
`AUDIT_REPORT.md`.
