-- ============================================================================
-- 041 — Messaggio d'errore corretto nella protezione dei dati d'identità
-- ============================================================================
--
-- La 040 blocca già le modifiche dal browser a stato, indirizzo web, email,
-- partita IVA, proprietario e piano. Provato: il blocco funziona. Ma
-- l'errore restituito era "malformed array literal: status" (codice 22P02)
-- invece del messaggio previsto (codice 42501): `v_changed || 'status'`, con
-- un letterale senza tipo, Postgres lo interpreta come un array. Si sostituisce
-- con array_append, che non è ambiguo.
--
-- SICURA DA ESEGUIRE IN QUALUNQUE MOMENTO: cambia solo il testo e il codice
-- dell'errore, non chi può fare cosa.
--
-- (La funzione guard_restaurant_payment_columns della 028 usa lo stesso modo e
-- ha lo stesso difetto di messaggio: blocca comunque. Non si tocca qui.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_restaurant_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
BEGIN
  -- Il server passa: service_role e sessioni dirette (postgres).
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  -- L'admin lavora dal browser con il proprio accesso.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS DISTINCT FROM OLD.slug THEN v_changed := array_append(v_changed, 'slug'); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_changed := array_append(v_changed, 'status'); END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN v_changed := array_append(v_changed, 'owner_id'); END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN v_changed := array_append(v_changed, 'plan'); END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN v_changed := array_append(v_changed, 'published_at'); END IF;
  -- Stringa vuota e NULL sono lo stesso "nessun valore".
  IF NULLIF(btrim(COALESCE(NEW.email, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(OLD.email, '')), '') THEN
    v_changed := array_append(v_changed, 'email');
  END IF;
  IF NULLIF(btrim(COALESCE(NEW.vat_number, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(OLD.vat_number, '')), '') THEN
    v_changed := array_append(v_changed, 'vat_number');
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    RAISE EXCEPTION 'Dati modificabili solo dall''amministratore: %',
      array_to_string(v_changed, ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
