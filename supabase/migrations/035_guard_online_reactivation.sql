-- ============================================================================
-- 035 — UN ORDINE ONLINE NON PAGATO NON ENTRA IN PREPARAZIONE
-- ============================================================================
--
-- Un ordine online scaduto o annullato ha l'autorizzazione di carta annullata:
-- il cliente non è stato addebitato. Il pannello nasconde "Riattiva" per questi
-- ordini, ma il database non lo impediva: un aggiornamento diretto portava a
-- 'preparing' un ordine che nessuno aveva pagato. Ora il trigger lo rifiuta
-- (42501). Gli ordini pagati, e quelli in contanti o POS, non cambiano.
--
-- Si sostituisce solo la funzione di guardia (034); il trigger che la richiama
-- resta quello della 028.
-- ============================================================================

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

  -- Un ordine online che non è stato incassato (scaduto, annullato, pagamento
  -- non riuscito) non può entrare in preparazione dal browser: la cucina
  -- preparerebbe un ordine che nessuno ha pagato. Un ordine pagato passa
  -- liberamente; uno solo autorizzato passa dal server (regola qui sopra).
  IF COALESCE(OLD.payment_method, 'cash') = 'online'
     AND NEW.status IN ('preparing', 'ready', 'delivering', 'delivered')
     AND NEW.status IS DISTINCT FROM OLD.status
     AND OLD.payment_status NOT IN ('paid', 'partially_refunded') THEN
    RAISE EXCEPTION 'Un ordine online non pagato non entra in preparazione'
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
--   Con una sessione da titolare, su un ordine online scaduto:
--     update orders set status = 'preparing' where id = <ordine online scaduto>;
--   atteso: 42501 "Un ordine online non pagato non entra in preparazione"
