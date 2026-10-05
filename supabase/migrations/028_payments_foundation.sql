-- ============================================================================
-- 028 — BASE DEI PAGAMENTI ONLINE (Stripe Connect)
-- ============================================================================
--
-- Fase 1 del piano pagamenti (C6, A9, A10 di AUDIT_REPORT.md). Solo struttura:
-- nessun codice la usa ancora, e il codice in produzione continua a funzionare
-- invariato. Non cambia il comportamento della vetrina.
--
-- MODELLO. Ogni ristorante incassa sul PROPRIO account Stripe (Standard,
-- direct charges): i fondi non passano da InnovaGo e non c'è commissione. Il
-- collegamento lo fa il titolare con la procedura di Stripe; lo stato reale
-- (account attivo o no) lo scrive solo il server, leggendolo da Stripe.
--
-- COSA FA
--   1. restaurants  colonne di stato del collegamento Stripe, scritte solo dal
--                   server; trigger che impedisce a titolari e admin di
--                   autodichiarare un collegamento (A9).
--   2. orders       stato 'awaiting_payment' e colonne di pagamento; trigger
--                   che ne limita la scrittura al server; divieto di pagamento
--                   online per gli ordini al tavolo.
--   3. stripe_events  registro degli eventi del webhook, per non elaborarli
--                   due volte.
--   4. release_promo_usage()  restituisce l'utilizzo di un codice promo
--                   quando un ordine non pagato scade.
--   5. IBAN         elimina iban_enabled, online_payment_account e
--                   iban_holder (mai usati da alcun flusso).
--
-- NOTE SUI TRIGGER DI GUARDIA. "Il server" è chiunque non sia `anon` né
-- `authenticated`: la service role key delle route API e le sessioni dirette
-- sul database (SQL Editor). Le funzioni SECURITY DEFINER eseguono come
-- proprietario e quindi passano. Il confronto è sui valori, non sulla
-- presenza della colonna: un salvataggio del pannello o del wizard che
-- rimanda gli stessi valori già presenti NON viene bloccato, e il pannello
-- attuale continua a funzionare finché non viene sostituito (Fase 3).
-- Cambiare un valore protetto dal browser dà invece 42501.
--
-- ORDINE DI RILASCIO: indifferente rispetto al deploy.
-- ============================================================================

-- ─── 1. restaurants ─────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS stripe_account_id        text,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_requirements      jsonb,
  ADD COLUMN IF NOT EXISTS stripe_synced_at         timestamptz;

-- Un account Stripe appartiene a un solo ristorante.
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_stripe_account_id_key
  ON public.restaurants (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN public.restaurants.stripe_account_id IS
  'Id dell''account Stripe collegato (acct_…). Scritto solo dal server. NULL = non collegato.';
COMMENT ON COLUMN public.restaurants.stripe_connected IS
  'Dal collegamento reale: TRUE solo se Stripe riferisce charges_enabled sull''account. Scritto solo dal server (era un''autodichiarazione).';
COMMENT ON COLUMN public.restaurants.stripe_payouts_enabled IS
  'Stripe riferisce payouts_enabled. Solo server.';
COMMENT ON COLUMN public.restaurants.stripe_details_submitted IS
  'Il titolare ha completato la procedura di collegamento. Solo server.';
COMMENT ON COLUMN public.restaurants.stripe_requirements IS
  'Cosa Stripe chiede ancora (currently_due, disabled_reason…). Solo server.';
COMMENT ON COLUMN public.restaurants.stripe_synced_at IS
  'Ultimo allineamento dello stato con Stripe. Solo server.';

-- Nessun GRANT ad anon: la 017 concede per colonna e le colonne nuove non
-- entrano nella concessione.

CREATE OR REPLACE FUNCTION public.guard_restaurant_payment_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
  o_account text;       o_connected boolean;  o_payouts boolean;
  o_submitted boolean;  o_requirements jsonb; o_synced timestamptz;
  o_label text;         o_pp_connected boolean; o_pp_email text;
BEGIN
  -- Il server passa: service_role e sessioni dirette (postgres).
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    o_account := OLD.stripe_account_id;           o_connected := OLD.stripe_connected;
    o_payouts := OLD.stripe_payouts_enabled;      o_submitted := OLD.stripe_details_submitted;
    o_requirements := OLD.stripe_requirements;    o_synced := OLD.stripe_synced_at;
    o_label := OLD.stripe_account_label;
    o_pp_connected := OLD.paypal_connected;       o_pp_email := OLD.paypal_email;
  ELSE
    -- Nuovo ristorante: ogni valore protetto deve partire dal valore neutro.
    o_account := NULL;   o_connected := false;    o_payouts := false;
    o_submitted := false; o_requirements := NULL; o_synced := NULL;
    o_label := NULL;     o_pp_connected := false; o_pp_email := NULL;
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM o_account THEN
    v_changed := v_changed || 'stripe_account_id';
  END IF;
  IF COALESCE(NEW.stripe_connected, false) IS DISTINCT FROM COALESCE(o_connected, false) THEN
    v_changed := v_changed || 'stripe_connected';
  END IF;
  IF COALESCE(NEW.stripe_payouts_enabled, false) IS DISTINCT FROM COALESCE(o_payouts, false) THEN
    v_changed := v_changed || 'stripe_payouts_enabled';
  END IF;
  IF COALESCE(NEW.stripe_details_submitted, false) IS DISTINCT FROM COALESCE(o_submitted, false) THEN
    v_changed := v_changed || 'stripe_details_submitted';
  END IF;
  IF NEW.stripe_requirements IS DISTINCT FROM o_requirements THEN
    v_changed := v_changed || 'stripe_requirements';
  END IF;
  IF NEW.stripe_synced_at IS DISTINCT FROM o_synced THEN
    v_changed := v_changed || 'stripe_synced_at';
  END IF;
  -- Stringa vuota e NULL sono lo stesso "nessun valore": il pannello e il
  -- wizard attuali salvano '' dove il database ha NULL.
  IF NULLIF(btrim(COALESCE(NEW.stripe_account_label, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(o_label, '')), '') THEN
    v_changed := v_changed || 'stripe_account_label';
  END IF;
  -- PayPal: nessun collegamento reale esiste ancora, quindi nessuno può
  -- dichiararlo (stesso difetto di A9).
  IF COALESCE(NEW.paypal_connected, false) IS DISTINCT FROM COALESCE(o_pp_connected, false) THEN
    v_changed := v_changed || 'paypal_connected';
  END IF;
  IF NULLIF(btrim(COALESCE(NEW.paypal_email, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(o_pp_email, '')), '') THEN
    v_changed := v_changed || 'paypal_email';
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    RAISE EXCEPTION 'Colonne gestite dal server, non modificabili dal client: %',
      array_to_string(v_changed, ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restaurants_guard_payment ON public.restaurants;
CREATE TRIGGER restaurants_guard_payment
  BEFORE INSERT OR UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.guard_restaurant_payment_columns();

-- ─── 2. orders ──────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method           text,
  ADD COLUMN IF NOT EXISTS payment_status           text          NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_account_id        text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_amount              numeric(10,2),
  ADD COLUMN IF NOT EXISTS refunded_amount          numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at                  timestamptz,
  ADD COLUMN IF NOT EXISTS payment_expires_at       timestamptz;

COMMENT ON COLUMN public.orders.payment_method IS
  'cash | pos | online. NULL = ordine precedente alla registrazione del metodo.';
COMMENT ON COLUMN public.orders.payment_status IS
  'unpaid = da incassare (contanti/POS) | pending = pagamento online avviato | paid | failed | refunded | partially_refunded. Online: scritto solo dal server.';
COMMENT ON COLUMN public.orders.stripe_account_id IS
  'Account Stripe su cui è stato creato il pagamento (può differire dall''attuale se il ristorante si ricollega).';
COMMENT ON COLUMN public.orders.payment_expires_at IS
  'Scadenza di un ordine in awaiting_payment (30 minuti dalla creazione).';

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_key
  ON public.orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Per il job che fa scadere gli ordini non pagati.
CREATE INDEX IF NOT EXISTS orders_awaiting_payment_expiry_idx
  ON public.orders (payment_expires_at)
  WHERE status = 'awaiting_payment';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'new', 'pending', 'preparing', 'ready',
    'delivering', 'delivered', 'cancelled', 'expired',
    'awaiting_payment'
  ));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'pos', 'online'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
  ));

-- Decisione di prodotto: al tavolo solo cassa e POS, niente pagamento online.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_no_online_table;
ALTER TABLE public.orders ADD CONSTRAINT orders_no_online_table
  CHECK (NOT (type = 'tavolo' AND payment_method = 'online'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_refund_within_paid;
ALTER TABLE public.orders ADD CONSTRAINT orders_refund_within_paid
  CHECK (refunded_amount >= 0 AND refunded_amount <= COALESCE(paid_amount, 0));

CREATE OR REPLACE FUNCTION public.guard_order_payment_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Il titolare può creare ordini (conversione di una prenotazione), ma
    -- non ordini online né già pagati: sono prerogativa del server.
    IF NEW.status = 'awaiting_payment'
       OR NEW.payment_status <> 'unpaid'
       OR COALESCE(NEW.payment_method, 'cash') NOT IN ('cash', 'pos')
       OR NEW.stripe_account_id IS NOT NULL
       OR NEW.stripe_payment_intent_id IS NOT NULL
       OR NEW.paid_amount IS NOT NULL
       OR NEW.refunded_amount <> 0
       OR NEW.paid_at IS NOT NULL
       OR NEW.payment_expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'Dati di pagamento online gestiti dal server, non scrivibili dal client'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
     OR NEW.refunded_amount IS DISTINCT FROM OLD.refunded_amount
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at THEN
    RAISE EXCEPTION 'Stato del pagamento gestito dal server, non modificabile dal client'
      USING ERRCODE = '42501';
  END IF;

  -- Il metodo può essere corretto fra contanti e POS (il cliente ha scelto
  -- uno e ha pagato con l'altro); mai da o verso 'online'.
  IF NEW.payment_method IS DISTINCT FROM OLD.payment_method
     AND NOT (
       COALESCE(OLD.payment_method, 'cash') IN ('cash', 'pos')
       AND NEW.payment_method IN ('cash', 'pos')
     ) THEN
    RAISE EXCEPTION 'Il metodo di pagamento online non è modificabile dal client'
      USING ERRCODE = '42501';
  END IF;

  -- Un ordine in attesa di pagamento non entra in cucina da solo: può solo
  -- essere annullato. Il passaggio a 'new' lo fa il server alla conferma di
  -- Stripe.
  IF OLD.status = 'awaiting_payment'
     AND NEW.status NOT IN ('awaiting_payment', 'cancelled') THEN
    RAISE EXCEPTION 'Un ordine in attesa di pagamento può solo essere annullato'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'awaiting_payment' AND OLD.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Lo stato awaiting_payment è assegnabile solo alla creazione dell''ordine'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_payment ON public.orders;
CREATE TRIGGER orders_guard_payment
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_payment_columns();

-- ─── 3. Registro degli eventi del webhook ───────────────────────────────────
--
-- Stripe consegna gli eventi almeno una volta, a volte più volte e fuori
-- ordine. Il server inserisce l'id dell'evento prima di elaborarlo: se esiste
-- già ed è stato elaborato, lo salta; se esiste ma non è stato elaborato (un
-- tentativo precedente è fallito) lo riprende. Nessuna policy: accessibile
-- solo con la service role key.

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id                text        PRIMARY KEY,
  type              text        NOT NULL,
  stripe_account_id text,
  livemode          boolean     NOT NULL DEFAULT false,
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  attempts          integer     NOT NULL DEFAULT 1,
  last_error        text
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_events FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS stripe_events_unprocessed_idx
  ON public.stripe_events (received_at)
  WHERE processed_at IS NULL;

-- ─── 4. Restituzione di un utilizzo promo ───────────────────────────────────
--
-- Il consumo avviene prima dell'ordine (increment_promo_usage, mig. 018). Se
-- un ordine online non viene pagato e scade, l'utilizzo va restituito. UPDATE
-- atomico, nessun rischio di scendere sotto zero; il chiamante decide quando
-- restituire (una sola volta per ordine, alla transizione di stato).

CREATE OR REPLACE FUNCTION public.release_promo_usage(p_promo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promos
     SET used_count = used_count - 1
   WHERE id = p_promo_id
     AND COALESCE(used_count, 0) > 0;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.release_promo_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_promo_usage(uuid) TO service_role;

-- ─── 5. Colonne IBAN ────────────────────────────────────────────────────────
--
-- Mai usate da alcun flusso e rimosse dall'interfaccia nella 1.30.5.
-- iban_enabled è anche nella vista restaurants_public (mig. 026), che va
-- quindi ricreata senza. Il blocco è transazionale: se un'altra vista creata a
-- mano dipendesse da queste colonne, DROP COLUMN fallirebbe e nulla verrebbe
-- applicato.

DROP VIEW IF EXISTS public.restaurants_public;

ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS iban_enabled,
  DROP COLUMN IF EXISTS online_payment_account,
  DROP COLUMN IF EXISTS iban_holder;

CREATE VIEW public.restaurants_public AS
SELECT
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
  scheduled_orders, hours_config, tables_count,
  plan,
  published_at, created_at, updated_at
FROM public.restaurants
WHERE status = 'published';

REVOKE ALL ON public.restaurants_public FROM PUBLIC;
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'orders'
--      AND column_name IN ('payment_method','payment_status','stripe_payment_intent_id',
--                          'paid_amount','refunded_amount','paid_at','payment_expires_at');
--   -- 7 righe
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'restaurants'
--      AND (column_name LIKE 'stripe_%' OR column_name LIKE 'iban%' OR column_name = 'online_payment_account');
--   -- stripe_*: enabled, connected, account_label, delivery, pickup, table,
--   --           account_id, payouts_enabled, details_submitted, requirements, synced_at
--   -- nessuna colonna iban / online_payment_account
--
--   SELECT tgname FROM pg_trigger
--    WHERE tgname IN ('restaurants_guard_payment', 'orders_guard_payment');  -- 2 righe
