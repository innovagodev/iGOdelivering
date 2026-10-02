-- ============================================================================
-- 024 — TOKEN DI ATTIVAZIONE IN UNA TABELLA SEPARATA
-- ============================================================================
--
-- `restaurants.activation_token` era leggibile da QUALUNQUE utente
-- autenticato per i ristoranti pubblicati: la restrizione per colonna della
-- 017 vale solo per `anon`, e la policy "restaurants: public read published"
-- vale per tutti i ruoli. Verificato il 2 ottobre 2026 con un utente di test.
-- Il token è l'unica credenziale del link di attivazione: un ristoratore
-- poteva leggerlo e impossessarsi di un locale pubblicato ma non ancora
-- attivato. Rilievo N18 di AUDIT_REPORT.md.
--
-- Una restrizione per colonna per `authenticated` romperebbe le
-- select('*') del pannello (è il problema già incontrato con la 017). Il token
-- passa quindi in una tabella senza alcuna policy, accessibile solo con la
-- service role key.
--
-- ⚠️ ORDINE DI RILASCIO
--   1. questa migration          (crea la tabella e copia i token esistenti)
--   2. deploy del codice         (emette e consuma i token dalla tabella nuova)
--   3. migration 025             (elimina le vecchie colonne da restaurants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_activation_tokens (
  restaurant_id uuid        PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  token         uuid        NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_activation_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.restaurant_activation_tokens FROM anon, authenticated;

-- Token già emessi e non ancora usati: restano validi fino alla scadenza.
INSERT INTO public.restaurant_activation_tokens (restaurant_id, token, expires_at)
SELECT id, activation_token, COALESCE(activation_token_expires_at, now())
  FROM public.restaurants
 WHERE activation_token IS NOT NULL
   AND owner_id IS NULL
ON CONFLICT (restaurant_id) DO NOTHING;

-- ─── Consumo atomico ────────────────────────────────────────────────────────
--
-- Assegna il proprietario e cancella il token nella stessa transazione.
-- Restituisce l'id del ristorante, o NULL se il token non esiste, è scaduto
-- o il locale ha già un proprietario. Due chiamate concorrenti con lo stesso
-- token: la seconda attende il lock di riga su restaurants, rivaluta
-- `owner_id IS NULL` sulla versione aggiornata e non trova nulla.

CREATE OR REPLACE FUNCTION public.claim_restaurant(p_token uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.restaurants r
     SET owner_id = p_user_id
    FROM public.restaurant_activation_tokens t
   WHERE t.token = p_token
     AND t.restaurant_id = r.id
     AND t.expires_at > now()
     AND r.owner_id IS NULL
  RETURNING r.id INTO v_id;

  IF v_id IS NOT NULL THEN
    DELETE FROM public.restaurant_activation_tokens WHERE restaurant_id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_restaurant(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_restaurant(uuid, uuid) TO service_role;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT count(*) FROM public.restaurant_activation_tokens;
--   SELECT count(*) FROM public.restaurants
--    WHERE activation_token IS NOT NULL AND owner_id IS NULL;
--   -- i due conteggi devono coincidere
