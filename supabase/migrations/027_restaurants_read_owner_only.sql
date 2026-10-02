-- ============================================================================
-- 027 — `restaurants` LEGGIBILE PER INTERO SOLO DA TITOLARE E ADMIN
-- ============================================================================
--
-- Seconda parte della chiusura di N18. La policy "restaurants: public read
-- published" passa da tutti i ruoli al solo `anon`, che resta limitato per
-- colonna dalla 017. Un utente autenticato vede sulla tabella solo il proprio
-- ristorante ("restaurants: owner read"), o tutti se admin; la vetrina legge
-- da `restaurants_public` (migration 026).
--
-- ⚠️ Da applicare SOLO DOPO il deploy del codice che legge la vetrina da
-- `restaurants_public`. Applicata prima, un ristoratore loggato che apre la
-- vetrina di un altro locale non la vedrebbe.
-- ============================================================================

DROP POLICY IF EXISTS "restaurants: public read published" ON public.restaurants;

CREATE POLICY "restaurants: public read published" ON public.restaurants
  FOR SELECT
  TO anon
  USING (status = 'published');

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT policyname, roles FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'restaurants';
--   -- "restaurants: public read published" con roles = {anon}
