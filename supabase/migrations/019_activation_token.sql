-- ============================================================================
-- 019 — TOKEN DI ATTIVAZIONE DEL RISTORATORE
-- ============================================================================
--
-- Allinea il repository allo schema reale: le due colonne qui sotto sono GIÀ
-- PRESENTI in produzione, applicate a mano, e non comparivano in alcuna
-- migration. Cfr. AUDIT_REPORT.md, rilievo N12.
--
-- Su un database che le ha già, questa migration non va eseguita. Serve a
-- rendere ricostruibile un ambiente nuovo: senza queste colonne
-- /api/ristoratore/register fallisce e il flusso di attivazione del
-- proprietario non funziona, senza una causa evidente.
--
-- A COSA SERVONO
--   Il link di attivazione inviato al proprietario portava `restaurant_id` ed
--   email, entrambi dati noti e non segreti: bastava conoscerli per rivendicare
--   l'account di un locale con `owner_id` ancora NULL. Il link porta ora un
--   token monouso con scadenza, l'unico identificatore che la route di
--   registrazione accetta. Cfr. AUDIT_REPORT.md, rilievo C4, e
--   src/lib/activationToken.ts.
--
-- ─── NOTA SULLA FEDELTÀ DI QUESTO FILE ──────────────────────────────────────
--   Il testo originale del DDL eseguito a mano non è recuperabile dal database:
--   quanto segue è ricostruito da un'introspezione dello schema reale.
--
--   Verificato:
--     · activation_token             uuid,        nullable, nessun default
--     · activation_token_expires_at  timestamptz, nullable, nessun default
--     · unicità su activation_token, realizzata come INDICE UNIVOCO PARZIALE e
--       non come vincolo, di nome restaurants_activation_token_key
--     · due righe con activation_token NULL sono entrambe accettate
--
--   Il nome emerge da una violazione provocata di proposito:
--       23505 duplicate key value violates unique constraint
--       "restaurants_activation_token_key"
--
--   Che sia un indice e non un vincolo è emerso da un secondo tentativo: una
--   ADD CONSTRAINT con quel nome, eseguita dopo aver verificato che
--   pg_constraint non contenesse nulla, è stata rifiutata con
--       42P07 relation "restaurants_activation_token_key" already exists
--   Il nome è dunque occupato da una relazione che non è un vincolo: un indice.
-- ============================================================================

-- ─── Colonne ────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS activation_token uuid,
  ADD COLUMN IF NOT EXISTS activation_token_expires_at timestamptz;

COMMENT ON COLUMN public.restaurants.activation_token IS
  'Token monouso del link di attivazione del proprietario. Azzerato nella '
  'stessa UPDATE che assegna owner_id. NULL = nessun invito in corso.';

COMMENT ON COLUMN public.restaurants.activation_token_expires_at IS
  'Scadenza del token di attivazione (7 giorni dall''emissione). '
  'NULL o già trascorsa = token non utilizzabile.';

-- ─── Unicità del token ──────────────────────────────────────────────────────
--
-- Due ristoranti non possono condividere lo stesso token: la route di
-- registrazione risolve il ristorante proprio a partire da quel valore, con
-- .eq('activation_token', token).maybeSingle(), che andrebbe in errore se le
-- righe fossero più d'una.
--
-- I NULL restano ammessi senza limite, ed è indispensabile: il token viene
-- azzerato all'uso, quindi tutti i ristoranti già attivati hanno NULL.

CREATE UNIQUE INDEX IF NOT EXISTS restaurants_activation_token_key
  ON public.restaurants (activation_token)
  WHERE activation_token IS NOT NULL;

-- ─── Privilegi ──────────────────────────────────────────────────────────────
--
-- Nessun GRANT: è deliberato.
--
-- La migration 017 ha revocato ad `anon` il SELECT di tabella su `restaurants`
-- e ha concesso solo le colonne che servono alla vetrina. Una colonna aggiunta
-- dopo non entra in quella concessione, quindi queste due nascono già
-- illeggibili con la chiave anon — verificato: `permission denied for table
-- restaurants`.
--
-- Non vanno MAI aggiunte all'elenco della 017 né alla select di
-- useRestaurantSettings.ts: un token leggibile dal browser è un token che
-- chiunque può usare per rivendicare il ristorante. Le uniche letture ammesse
-- sono quelle con service role key in /api/ristoratore/register,
-- /api/admin/activation-link e /api/admin/send-activation-email.
