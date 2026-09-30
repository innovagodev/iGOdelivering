-- ============================================================================
-- 020 — CHECKOUT SOLO LATO SERVER
-- ============================================================================
--
-- Chiude la scrittura diretta di ordini e prenotazioni dal browser con la
-- chiave anon. Da questa migration in poi la vetrina crea ordini e
-- prenotazioni solo tramite /api/orders e /api/bookings, che ricalcolano ogni
-- importo dal database (rilievo C8 di AUDIT_REPORT.md).
--
-- ⚠️ ORDINE DI RILASCIO — va applicata DOPO il deploy del codice che usa le
-- due route. Applicata prima, il checkout della vetrina ancora in produzione
-- verrebbe rifiutato da RLS e nessun cliente riuscirebbe a ordinare.
--
-- COSA CAMBIA
--   orders       "public insert" (WITH CHECK true, per tutti i ruoli) sostituita
--                da "owner insert": il ristoratore resta libero di creare
--                ordini nel proprio locale (conversione prenotazione → ordine in
--                /ristoratore/prenotazioni), l'anonimo no.
--   order_items  stessa sostituzione, con il vincolo sull'ordine di appartenenza.
--   bookings     "public insert" rimossa; al proprietario basta "owner all".
--   increment_promo_usage   non più eseguibile da anon e authenticated: il
--                consumo del codice avviene solo in /api/orders. Prima chiunque
--                poteva esaurire gli utilizzi di una promo chiamando la RPC.
--   generate_order_number   non più eseguibile da anon: resta ad authenticated
--                perché la usa il pannello del ristoratore.
--
-- Le route usano la service role key, che non è soggetta a RLS: nessuna policy
-- serve per loro.
-- ============================================================================

-- ─── orders ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "orders: public insert" ON public.orders;
DROP POLICY IF EXISTS "orders: owner insert" ON public.orders;

CREATE POLICY "orders: owner insert" ON public.orders
  FOR INSERT
  WITH CHECK (restaurant_id = public.my_restaurant_id() OR public.is_admin());

-- ─── order_items ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "order_items: public insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items: owner insert" ON public.order_items;

CREATE POLICY "order_items: owner insert" ON public.order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE restaurant_id = public.my_restaurant_id())
    OR public.is_admin()
  );

-- ─── bookings ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bookings: public insert" ON public.bookings;

-- ─── RPC ────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.increment_promo_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid) TO service_role;

-- generate_order_number non è in alcuna migration (è stata creata a mano in
-- produzione, come le colonne di N12): la firma si ricava dal catalogo invece
-- di scriverla a memoria, e il blocco agisce su ogni overload presente.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    WHERE p.proname = 'generate_order_number'
      AND p.pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
-- Da eseguire dopo la migration. Risultato atteso:
--   · nessuna riga con "public insert"
--   · "orders: owner insert" e "order_items: owner insert" presenti
--   · anon_exec = false per entrambe le funzioni, service_exec = true
--
--   SELECT tablename, policyname, cmd
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('orders', 'order_items', 'bookings')
--    ORDER BY 1, 2;
--
--   SELECT p.oid::regprocedure AS fn,
--          has_function_privilege('anon', p.oid, 'EXECUTE')         AS anon_exec,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
--          has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_exec
--     FROM pg_proc p
--    WHERE p.pronamespace = 'public'::regnamespace
--      AND p.proname IN ('increment_promo_usage', 'generate_order_number');
