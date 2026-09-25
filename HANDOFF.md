# Handoff — stato del progetto dopo le sessioni di audit

**Aggiornato:** 25 settembre 2026 · **Riferimento:** `5cf33ef` su `main`
**Da leggere insieme a:** `AUDIT_REPORT.md`

> **L'audit non è più di sola lettura.** Il prompt iniziale chiedeva una diagnosi
> senza modifiche. Quella fase è conclusa da tempo: i rilievi marcati ✅ nel
> report sono stati corretti, cinque migration sono applicate in produzione e il
> codice è su `main`. Chi riprende il lavoro deve partire da qui, non dal commit
> iniziale.

Il lavoro si è svolto in **due tornate**. La prima (22–23 settembre) ha
ripristinato il servizio: vetrina invisibile e checkout che perdeva gli ordini.
La seconda (25 settembre) ha chiuso una classe di difetti che la prima aveva solo
sfiorato — le operazioni che RLS scarta in silenzio — più due buchi di
autenticazione sulle route.

---

## Il fatto che ha ribaltato l'audit

La prima stesura del report si basava sui file in `supabase/migrations/`, dando
per scontato che descrivessero il database in esercizio. **Non lo descrivevano.**

Da lì, due conseguenze opposte:

- **Tre rilievi Critici erano infondati** (C1, C2, C3): le migration che li
  causavano non erano mai state applicate.
- **Due guasti reali e gravi non erano visibili dal codice**, perché il codice
  era corretto rispetto alle migration: la vetrina pubblica era invisibile agli
  utenti anonimi e il checkout perdeva gli ordini senza salvarli.

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
| Checkout e prenotazioni | ✅ funzionanti, verificati end-to-end |
| Colonne sensibili di `restaurants` | ✅ non leggibili da `anon` |
| Indici database | ✅ 13 |
| Storage per tenant | ✅ path annidati, oggetti migrati |
| PAT GitHub e chiave Resend | ✅ revocati e ruotati |
| Pagina di tracking ordine | ✅ funzionante, legge da route server-side |
| Scadenza ordine non confermato | ✅ persistita a database |
| Limite utilizzi codici promo | ✅ applicato, anche con checkout concorrenti |
| Promo "primo ordine" | ✅ non più riutilizzabile |
| Attivazione ristoratore | ✅ token monouso a scadenza |
| `send-status-email` | ✅ richiede sessione ristoratore o admin |
| Pagamenti | ❌ **inesistenti** — vedi sotto |

**Migration applicate:** 015, 016, 017, 018. La **019 non va eseguita**: versiona
colonne che in produzione esistono già.

---

## Le decisioni non ovvie, e perché

Sono i punti dove il codice sembra strano se non si conosce il motivo. Toccarli
senza sapere il perché rimette in produzione un guasto.

**1. L'id di ordini e prenotazioni è generato dal client, non dal database.**
`src/app/menu/[slug]/page.tsx`, tre punti di inserimento. Il pattern precedente
`insert(payload).select().single()` **falliva sempre** per gli utenti anonimi:
in PostgreSQL un `INSERT … RETURNING` richiede anche una policy **SELECT** che
copra la riga, e il cliente anonimo non ne ha alcuna su `orders`/`bookings`.
L'istruzione veniva annullata per intero: l'utente vedeva "Errore di rete" e
l'ordine non veniva salvato. *Non reintrodurre `.select()` dopo l'insert.*

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
Aprivano `orders`, `order_items` e `bookings` in lettura anonima (i rilievi C1 e
C2). Mai applicate in produzione — ma dal momento in cui lo schema è finito sotto
versionamento, chiunque allestisca un ambiente nuovo eseguendo la sequenza le
avrebbe applicate, creando davvero la falla. Contenuto sostituito da `SELECT 1;`
con la spiegazione in testa; i file restano per non alterare la numerazione.
*Non "ripristinarle" pensando che siano state svuotate per errore.*

**5. Gli upload di storage vanno sotto `<restaurantId>/`.**
Le policy di storage in produzione richiedono che il primo segmento del path sia
il `restaurantId`. Per un file nella radice del bucket `storage.foldername()` non
restituisce alcun segmento, quindi **ogni upload su path piatto veniva rifiutato**.
È la spiegazione più coerente del perché 159 `menu_items` su 159 non hanno
immagine. Nel wizard admin l'UUID del ristorante è generato prima dell'insert
proprio per poter costruire il path.

**6. Le scritture pubbliche passano da RPC `SECURITY DEFINER`, non da UPDATE diretti.**
`expire_order()` e `increment_promo_usage()` (migration 018) esistono perché gli
UPDATE anonimi equivalenti venivano scartati in silenzio. Entrambe **restituiscono
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

> **Attenzione operativa.** Ogni emissione di un link di attivazione **ruota il
> token**: premere "Copia link attivazione" invalida il link già spedito per
> email. È corretto per un monouso, ma cambia l'abitudine di lavoro.

---

## Cosa resta aperto, in ordine di gravità

**1. I pagamenti non esistono** (C6, C7, C8). Nessun gateway, nessun webhook,
nessuna colonna `payment_status`. Il checkout raccoglie PAN e CVV in chiaro in un
form custom — violazione PCI-DSS — li valida e li **scarta**: l'ordine è creato
senza addebito. In più `subtotal`, `discount`, `total` e i prezzi dei singoli
articoli arrivano dal browser e nessuna funzione server li ricalcola.

> **C8 viene prima di tutto il resto del blocco pagamenti.** Integrare un gateway
> senza aver spostato il calcolo lato server significa addebitare la cifra decisa
> dal cliente. È anche l'occasione giusta per generare `order_number` con una
> sequenza di database e chiudere N8.

**2. Overbooking illimitato** (C9). Nessun controllo di capienza: né vincolo DB,
né lock, né conteggio. `tables_count` serve solo ai QR code.

**3. Collisione `order_number`** (N8). Il contatore sta in `localStorage` e
riparte da `0001` su ogni dispositivo, ma in DB esiste
`UNIQUE (restaurant_id, order_number)`: **dal secondo ordine giornaliero dello
stesso ristorante da un browser diverso, l'insert viene rifiutato.** Il checkout
della vetrina e la conversione delle prenotazioni usano già
`generate_order_number`; resta da verificare che non sopravvivano altri punti con
il vecchio schema. A6, che dipendeva da questo, è già chiuso.

**4. Quattro punti con lo stesso difetto silenzioso** (N13). Il più urgente è
`loadHistoryOrders` in `menu/[slug]/page.tsx`, la modale "I miei ordini": stessa
dinamica della promo `first_order`, verosimilmente **già non funzionante in
produzione**. Gli altri tre sono latenti ma fragili.

**5. Nessun rate limit** su alcun endpoint pubblico. Gli INSERT anonimi di ordini
e prenotazioni non hanno né limite né captcha.

**6. Compensazione mancante su `used_count`.** Se l'insert dell'ordine fallisce
subito dopo l'incremento, quell'utilizzo di promo resta consumato a vuoto.
Preferibile a regalare sconti illimitati, ma andrà chiuso.

**7. Ruolo utente nel cookie client-side** (A1) e **nessuna suite di test**:
nessuno dei guasti trovati in queste due sessioni sarebbe stato intercettato
automaticamente.

Il quadro completo — 16 rilievi risolti, 28 aperti, 5 smentiti — è in
`AUDIT_REPORT.md`.
