-- ============================================================================
-- 032 — AUTORIZZAZIONE E CATTURA SEPARATE PER GLI ORDINI ONLINE
-- ============================================================================
--
-- Il pagamento online non addebita più subito: il PaymentIntent è creato con
-- capture_method = manual. Il cliente autorizza l'importo (la banca lo blocca),
-- l'ordine entra in cucina e parte la finestra di 3 minuti per accettarlo.
--   · il ristorante accetta   → il server cattura l'importo (payment_status 'paid')
--   · rifiuta o scade         → il server annulla l'autorizzazione ('voided'):
--                               nessun addebito, nessun rimborso da gestire
--
-- 1. orders.authorized_at / orders.accept_deadline: momento dell'autorizzazione
--    e scadenza dell'accettazione. La scadenza la decide il server; tracker
--    del cliente e pannello del ristoratore leggono la stessa.
-- 2. payment_status: nuovi valori 'authorized' e 'voided'.
-- 3. expire_order() non fa scadere un ordine con pagamento autorizzato: la
--    scadenza passa dal server, che deve annullare l'autorizzazione su Stripe.
-- 4. guard_order_payment_columns(): le nuove colonne sono scritte solo dal
--    server, e un ordine con pagamento autorizzato non cambia stato dal
--    browser (accettarlo senza catturare lascerebbe il ristorante senza
--    incasso, rifiutarlo senza annullare lascerebbe l'importo bloccato).
--
-- Ordine di rilascio: PRIMA del deploy del codice che usa la cattura manuale.
-- ============================================================================

-- ─── 1. Colonne ─────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS authorized_at   timestamptz,
  ADD COLUMN IF NOT EXISTS accept_deadline timestamptz;

COMMENT ON COLUMN public.orders.authorized_at IS
  'Momento in cui Stripe ha autorizzato (bloccato) l''importo. Solo server.';
COMMENT ON COLUMN public.orders.accept_deadline IS
  'Scadenza per l''accettazione di un ordine con pagamento autorizzato (3 minuti da authorized_at). Solo server.';

-- Per lo scarto degli ordini autorizzati e non accettati in tempo.
CREATE INDEX IF NOT EXISTS orders_authorized_deadline_idx
  ON public.orders (accept_deadline)
  WHERE payment_status = 'authorized';

-- ─── 2. payment_status ──────────────────────────────────────────────────────

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'unpaid', 'pending', 'authorized', 'paid', 'failed', 'voided',
    'refunded', 'partially_refunded'
  ));

COMMENT ON COLUMN public.orders.payment_status IS
  'unpaid = da incassare (contanti/POS) | pending = pagamento online avviato | authorized = importo bloccato in attesa che il ristorante accetti | paid = incassato | voided = autorizzazione annullata, nessun addebito | failed | refunded | partially_refunded. Online: scritto solo dal server.';

-- ─── 3. expire_order ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.orders
     SET status = 'expired'
   WHERE id = p_order_id
     AND status IN ('new', 'pending')
     AND payment_status NOT IN ('paid', 'partially_refunded', 'authorized');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ─── 4. Guardia sugli ordini (sostituisce quella della 030) ─────────────────

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
       OR NEW.payment_expires_at IS NOT NULL
       OR NEW.authorized_at IS NOT NULL
       OR NEW.accept_deadline IS NOT NULL THEN
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
     OR NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at
     OR NEW.authorized_at IS DISTINCT FROM OLD.authorized_at
     OR NEW.accept_deadline IS DISTINCT FROM OLD.accept_deadline THEN
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

  -- Un ordine con pagamento autorizzato si accetta (cattura) o si rifiuta
  -- (annullamento dell'autorizzazione) solo dal server: /api/order/accept e
  -- /api/order/cancel.
  IF OLD.payment_status = 'authorized'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Un ordine con pagamento autorizzato si accetta o si rifiuta dal server'
      USING ERRCODE = '42501';
  END IF;

  -- Un ordine già pagato online non si annulla né scade dal browser: va
  -- annullato con /api/order/cancel, che rimborsa il cliente su Stripe
  -- (migration 030). Altrimenti il cliente resterebbe addebitato per un
  -- ordine che non riceverà.
  IF OLD.payment_status IN ('paid', 'partially_refunded')
     AND NEW.status IN ('cancelled', 'expired')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Un ordine pagato online si annulla con il rimborso'
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

-- ─── Verifica ───────────────────────────────────────────────────────────────
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'orders'
--      AND column_name IN ('authorized_at', 'accept_deadline');   -- 2 righe
