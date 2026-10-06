-- ============================================================================
-- 030 — CICLO DI VITA DEGLI ORDINI ONLINE (piano pagamenti, fasi 5–7)
-- ============================================================================
--
-- 1. expire_order() non fa più scadere un ordine già pagato. Il tracker del
--    cliente la chiama dopo 3 minuti senza accettazione: per un ordine pagato
--    la scadenza lascerebbe il cliente addebitato per un ordine annullato. Un
--    ordine pagato resta in attesa finché il ristorante non lo accetta o lo
--    rifiuta (e il rifiuto rimborsa).
--
-- 2. expire_unpaid_order(id) / expire_unpaid_orders(): un ordine online non
--    pagato entro payment_expires_at (30 minuti) passa a 'expired' con
--    payment_status 'failed', e l'utilizzo dell'eventuale codice promo viene
--    restituito. Atomiche: la transizione avviene una volta sola, quindi il
--    promo non viene restituito due volte. Chiamate dal server (route e
--    webhook) e, se disponibile, da pg_cron (migration 031).
--
-- 3. guard_order_payment_columns(): il browser non può annullare né far
--    scadere un ordine pagato online; l'annullamento passa da una route che
--    rimborsa.
--
-- Ordine di rilascio: PRIMA del deploy delle fasi 4–7.
-- ============================================================================

-- ─── 1. expire_order ────────────────────────────────────────────────────────

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
     AND payment_status NOT IN ('paid', 'partially_refunded');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- ─── 2. Scadenza degli ordini online non pagati ─────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_unpaid_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_restaurant uuid;
  v_promo_code text;
BEGIN
  UPDATE public.orders
     SET status = 'expired',
         payment_status = 'failed'
   WHERE id = p_order_id
     AND status = 'awaiting_payment'
  RETURNING restaurant_id, promo_code INTO v_restaurant, v_promo_code;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_promo_code IS NOT NULL THEN
    UPDATE public.promos
       SET used_count = used_count - 1
     WHERE restaurant_id = v_restaurant
       AND code = v_promo_code
       AND COALESCE(used_count, 0) > 0;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM public.orders
     WHERE status = 'awaiting_payment'
       AND payment_expires_at < now()
     ORDER BY payment_expires_at
     LIMIT 500
  LOOP
    IF public.expire_unpaid_order(v_id) THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_unpaid_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_order(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO service_role;

-- ─── 3. Guardia sugli ordini (sostituisce quella della 028) ─────────────────

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
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('expire_unpaid_order', 'expire_unpaid_orders');  -- 2 righe
