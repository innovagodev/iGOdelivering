-- ============================================================================
-- 021 — RATE LIMIT PER LE ROUTE PUBBLICHE
-- ============================================================================
--
-- /api/orders e /api/bookings sono pubbliche per necessità: il cliente ordina
-- senza account. Senza un limite chiunque può riempire di ordini falsi il
-- pannello di un ristorante (rilievo M4 di AUDIT_REPORT.md).
--
-- Il contatore sta qui e non in memoria: su Vercel ogni richiesta può girare
-- su un'istanza diversa, e un contatore locale vedrebbe solo una parte del
-- traffico.
--
-- Finestra fissa: ogni chiave conta i colpi nella finestra corrente
-- (es. 10 minuti allineati all'orologio). L'incremento e la lettura avvengono
-- nello stesso INSERT … ON CONFLICT, quindi richieste concorrenti non possono
-- superare il limite leggendo entrambe un valore vecchio.
--
-- Ordine di rilascio: indifferente. Se la funzione non esiste ancora, le
-- route lasciano passare la richiesta e registrano l'errore nei log.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- RLS attiva e nessuna policy: la tabella è accessibile solo dalla funzione
-- qui sotto (SECURITY DEFINER) e dalla service role.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_hits   integer;
BEGIN
  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limits (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO v_hits;

  -- Pulizia occasionale delle finestre scadute, senza un job dedicato.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT public.check_rate_limit('verifica-021', 2, 60);  -- true
--   SELECT public.check_rate_limit('verifica-021', 2, 60);  -- true
--   SELECT public.check_rate_limit('verifica-021', 2, 60);  -- false
--   DELETE FROM public.rate_limits WHERE key = 'verifica-021';
