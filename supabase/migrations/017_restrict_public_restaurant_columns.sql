-- ============================================================================
-- 017 — RESTRIZIONE PER COLONNA SULLA LETTURA PUBBLICA DI restaurants
-- ============================================================================
--
--   ⚠  NON APPLICARE PRIMA DEL DEPLOY DELL'APPLICAZIONE (vedi PREREQUISITO).
--      Applicata prima, manda giù la vetrina.
--
-- NOTA SU UNA PRIMA VERSIONE INEFFICACE DI QUESTO FILE
--   La stesura iniziale usava solo
--       REVOKE SELECT (email, owner_id, ...) ON public.restaurants FROM anon;
--   ed era un no-op silenzioso. In PostgreSQL una revoca per-colonna non
--   sottrae nulla a una concessione per-tabella, e Supabase assegna ad `anon`
--   un GRANT SELECT sull'intera tabella. Non veniva emesso alcun errore, il
--   che rendeva il problema invisibile: la verifica in fondo a questo file
--   serve proprio a non fidarsi dell'assenza di errori.
--   L'ordine corretto è: revocare la tabella, poi concedere le sole colonne
--   ammesse.
--
-- PROBLEMA CHE CHIUDE
--   La 015 ha ripristinato la lettura pubblica di `restaurants`, ma le RLS
--   filtrano righe, non colonne: la riga è leggibile per intero. Oggi i campi
--   bancari e fiscali sono NULL, quindi l'esposizione concreta è limitata a
--   `email` (indirizzo personale del proprietario) e `owner_id`. Nel momento
--   in cui un ristoratore compila l'IBAN dalla pagina Pagamenti, quel dato
--   diventa leggibile da chiunque con la chiave anon — che è pubblica per
--   costruzione, essendo inclusa nel bundle JavaScript.
--
-- PREREQUISITO — MODIFICA APPLICATIVA OBBLIGATORIA
--   PostgREST traduce `select('*')` in `SELECT *`, che PostgreSQL espande su
--   TUTTE le colonne: senza privilegio su una sola di esse l'intera query
--   fallisce con "permission denied for column".
--
--   Va quindi sostituito, in src/hooks/useRestaurantSettings.ts, il
--       .select('*, restaurant_hours(*)')
--   con l'elenco esplicito delle sole colonne concesse qui sotto.
--
--   Verificato: vat_number, online_payment_account, iban_holder, paypal_email
--   e stripe_account_label compaiono solo nella dichiarazione dell'interfaccia
--   UnifiedSettings e non sono mai letti dalla vetrina.
--
-- ORDINE DI ESECUZIONE
--   1. deploy dell'app con la select esplicita
--   2. verifica che /menu/[slug] funzioni in finestra anonima
--   3. solo allora, questa migration
--   4. la verifica in fondo a questo file
--
-- ALTERNATIVA STRUTTURALMENTE MIGLIORE (non implementata qui)
--   Spostare i campi di incasso in una tabella `restaurant_payment_details`
--   con RLS riservata a proprietario e admin. Le colonne sparirebbero da
--   `restaurants`, `select('*')` continuerebbe a funzionare, e non servirebbe
--   ricordarsi di revocare ogni nuova colonna sensibile. Oggi il costo di
--   migrazione dati è nullo (tutti i valori sono NULL).
-- ============================================================================

-- Si agisce solo sul ruolo anonimo: `authenticated` continua a servire il
-- pannello ristoratore e quello admin, dove questi campi sono necessari.

-- 1. Azzera il privilegio di tabella, che altrimenti prevale su ogni
--    restrizione per colonna.
REVOKE SELECT ON public.restaurants FROM anon;

-- 2. Riconcede le sole colonne che servono alla vetrina pubblica.
--    Esclusi di proposito: email, owner_id, vat_number,
--    online_payment_account, iban_holder, paypal_email, stripe_account_label.
GRANT SELECT (
  id, name, slug, status, tagline, description,
  address, city, province, cap, phone, category,
  logo_url, background_url,
  delivery_enabled, pickup_enabled, table_enabled,
  delivery_fee, min_order, free_delivery_threshold, free_delivery_active,
  card_delivery, card_pickup, card_table,
  cash_delivery, cash_pickup, cash_table,
  paypal_enabled, paypal_connected,
  paypal_delivery, paypal_pickup, paypal_table,
  stripe_enabled, stripe_connected,
  stripe_delivery, stripe_pickup, stripe_table,
  iban_enabled,
  scheduled_orders, hours_config, tables_count,
  published_at, created_at, updated_at
) ON public.restaurants TO anon;

-- Promemoria: ogni colonna aggiunta in futuro a `restaurants` NON sarà
-- leggibile da anon finché non viene inclusa nella GRANT qui sopra. È il
-- comportamento voluto — meglio una colonna invisibile che una esposta.

-- ─── VERIFICA (da eseguire dopo, con la chiave anon) ────────────────────────
--   select('id,name,slug')            → deve restituire i ristoranti pubblicati
--   select('online_payment_account')  → deve dare "permission denied for column"
--   select('*')                       → FALLISCE: è il motivo del prerequisito
--
-- Non fidarsi dell'assenza di errori durante l'applicazione: la prima versione
-- di questo file non dava errori e non faceva nulla.
