# Handoff — stato del progetto dopo la sessione di audit

**Aggiornato:** 23 settembre 2026 · **Riferimento:** `HEAD` (v1.29.3), non più `c144d72`
**Da leggere insieme a:** `AUDIT_REPORT.md`

> **L'audit non è più di sola lettura.** Il prompt iniziale chiedeva una diagnosi
> senza modifiche. Quella fase è conclusa: i rilievi marcati ✅ nel report sono
> stati corretti, tre migration sono applicate in produzione e il codice è
> deployato. Chi riprende il lavoro deve partire da qui, non dal commit iniziale.

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
| Pagamenti | ❌ **inesistenti** — vedi sotto |

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
aggiunta alla select va aggiunta anche alla `GRANT` della 017, e viceversa.*

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

---

## Cosa è cambiato nel codice

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
> sequenza di database e chiudere N8 e A6 nello stesso intervento.

**2. Overbooking illimitato** (C9). Nessun controllo di capienza: né vincolo DB,
né lock, né conteggio. `tables_count` serve solo ai QR code.

**3. Collisione `order_number`** (N8). Il contatore sta in `localStorage` e
riparte da `0001` su ogni dispositivo, ma in DB esiste
`UNIQUE (restaurant_id, order_number)`: **dal secondo ordine giornaliero dello
stesso ristorante da un browser diverso, l'insert viene rifiutato.**

**4. Scadenza ordini non persistita** (A7, parziale). La 016 ha tolto il vincolo
CHECK, ma l'UPDATE anonimo non vede la riga da aggiornare e tocca zero righe
senza errore. Va spostata lato server.

Il quadro completo, con i 32 rilievi fra aperti e parziali e i 5 smentiti, è in
`AUDIT_REPORT.md`.
