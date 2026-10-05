-- ============================================================================
-- 029 — CORREZIONE DEL TRIGGER DI GUARDIA SU restaurants (migration 028)
-- ============================================================================
--
-- Nella 028 la funzione guard_restaurant_payment_columns() accumulava i nomi
-- delle colonne modificate con `v_changed || 'nome_colonna'`. PostgreSQL
-- risolve l'operatore come array || array e prova a leggere la stringa come
-- letterale di array: la modifica vietata falliva con
--     22P02 malformed array literal: "stripe_connected"
-- invece che con il 42501 previsto e il messaggio che elenca le colonne.
--
-- La protezione reggeva comunque — l'errore annullava l'operazione — ma per
-- la ragione sbagliata e con un messaggio incomprensibile. Trovato dal
-- collaudo della 028 (5 ottobre 2026). Si sostituisce solo la funzione: il
-- trigger che la richiama resta quello della 028.
-- ============================================================================

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
    v_changed := array_append(v_changed, 'stripe_account_id'::text);
  END IF;
  IF COALESCE(NEW.stripe_connected, false) IS DISTINCT FROM COALESCE(o_connected, false) THEN
    v_changed := array_append(v_changed, 'stripe_connected'::text);
  END IF;
  IF COALESCE(NEW.stripe_payouts_enabled, false) IS DISTINCT FROM COALESCE(o_payouts, false) THEN
    v_changed := array_append(v_changed, 'stripe_payouts_enabled'::text);
  END IF;
  IF COALESCE(NEW.stripe_details_submitted, false) IS DISTINCT FROM COALESCE(o_submitted, false) THEN
    v_changed := array_append(v_changed, 'stripe_details_submitted'::text);
  END IF;
  IF NEW.stripe_requirements IS DISTINCT FROM o_requirements THEN
    v_changed := array_append(v_changed, 'stripe_requirements'::text);
  END IF;
  IF NEW.stripe_synced_at IS DISTINCT FROM o_synced THEN
    v_changed := array_append(v_changed, 'stripe_synced_at'::text);
  END IF;
  -- Stringa vuota e NULL sono lo stesso "nessun valore": il pannello e il
  -- wizard attuali salvano '' dove il database ha NULL.
  IF NULLIF(btrim(COALESCE(NEW.stripe_account_label, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(o_label, '')), '') THEN
    v_changed := array_append(v_changed, 'stripe_account_label'::text);
  END IF;
  -- PayPal: nessun collegamento reale esiste ancora, quindi nessuno può
  -- dichiararlo (stesso difetto di A9).
  IF COALESCE(NEW.paypal_connected, false) IS DISTINCT FROM COALESCE(o_pp_connected, false) THEN
    v_changed := array_append(v_changed, 'paypal_connected'::text);
  END IF;
  IF NULLIF(btrim(COALESCE(NEW.paypal_email, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(o_pp_email, '')), '') THEN
    v_changed := array_append(v_changed, 'paypal_email'::text);
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    RAISE EXCEPTION 'Colonne gestite dal server, non modificabili dal client: %',
      array_to_string(v_changed, ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--   Con una sessione da titolare:
--     update restaurants set stripe_connected = true where id = <proprio>;
--   atteso: 42501 "Colonne gestite dal server, non modificabili dal client:
--   stripe_connected"
