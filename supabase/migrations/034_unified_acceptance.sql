-- ============================================================================
-- 034 — ACCETTAZIONE UNIFICATA DI ORDINI E PRENOTAZIONI
-- ============================================================================
--
-- Una sola regola per ogni tipo di richiesta (asporto, domicilio, tavolo,
-- prenotazione con o senza pre-ordine; contanti, POS e carta):
--
--   acceptance_mode = 'live'      il locale è aperto quando il cliente ordina:
--                                 il ristorante ha 3 minuti per accettare e il
--                                 cliente li vede scorrere.
--   acceptance_mode = 'deferred'  il locale è chiuso (preordine): niente
--                                 timer, la scadenza è un'ora dopo la prossima
--                                 apertura e il cliente la legge per esteso.
--
-- Il server decide modalità e scadenza (accept_deadline) e fa scadere la
-- richiesta quando la scadenza passa: l'ordine diventa 'expired', la
-- prenotazione 'expired', e un'eventuale autorizzazione di carta viene
-- annullata (nessun addebito). Cliente, pannello del ristoratore e cron
-- leggono lo stesso dato.
--
-- Ordine di rilascio: PRIMA del deploy del codice che usa queste colonne.
-- ============================================================================

-- ─── 1. orders ──────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS acceptance_mode text;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_acceptance_mode_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_acceptance_mode_check
  CHECK (acceptance_mode IS NULL OR acceptance_mode IN ('live', 'deferred'));

COMMENT ON COLUMN public.orders.acceptance_mode IS
  'live = locale aperto all''ordine, 3 minuti per accettare | deferred = locale chiuso, scadenza dopo la prossima apertura. NULL = ordine precedente alla regola. Solo server.';
COMMENT ON COLUMN public.orders.accept_deadline IS
  'Scadenza per accettare l''ordine (contanti, POS e carta). Solo server.';

-- Per il job che fa scadere gli ordini non accettati in tempo.
CREATE INDEX IF NOT EXISTS orders_pending_deadline_idx
  ON public.orders (accept_deadline)
  WHERE status IN ('new', 'pending');

-- ─── 2. bookings ────────────────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS acceptance_mode text,
  ADD COLUMN IF NOT EXISTS accept_deadline timestamptz;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_acceptance_mode_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_acceptance_mode_check
  CHECK (acceptance_mode IS NULL OR acceptance_mode IN ('live', 'deferred'));

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired'));

COMMENT ON COLUMN public.bookings.acceptance_mode IS
  'live | deferred, come per gli ordini. Solo server.';
COMMENT ON COLUMN public.bookings.accept_deadline IS
  'Scadenza per confermare la prenotazione. Solo server.';

CREATE INDEX IF NOT EXISTS bookings_pending_deadline_idx
  ON public.bookings (accept_deadline)
  WHERE status = 'pending';

-- ─── 3. Guardia sugli ordini (sostituisce quella della 032) ─────────────────

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
       OR NEW.accept_deadline IS NOT NULL
       OR NEW.acceptance_mode IS NOT NULL THEN
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
     OR NEW.accept_deadline IS DISTINCT FROM OLD.accept_deadline
     OR NEW.acceptance_mode IS DISTINCT FROM OLD.acceptance_mode THEN
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
  -- (migration 030).
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
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND column_name IN ('acceptance_mode', 'accept_deadline')
--      AND table_name IN ('orders', 'bookings');           -- 4 righe
