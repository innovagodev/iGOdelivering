-- ============================================================================
-- 037 — Interventi sui rilievi del Security Advisor di Supabase (8 ottobre 2026)
-- ============================================================================
--
-- SICURA DA ESEGUIRE IN QUALUNQUE MOMENTO: non cambia il comportamento
-- dell'applicazione. (La 038, invece, va eseguita DOPO il deploy del codice.)
--
-- A) search_path fisso sulle funzioni (lint 0011 "function_search_path_mutable")
--    Senza un search_path impostato, una funzione risolve i nomi in base allo
--    schema di chi la chiama. Per quelle SECURITY DEFINER è la via classica per
--    far eseguire al database codice con i privilegi del proprietario.
--    Si fissa a "public, pg_temp". Si cercano le funzioni per nome (non per
--    firma): alcune sono state create a mano e non compaiono in nessuna
--    migration.
--
-- B) expire_order (lint 0028 e 0029)
--    Funzione di uso interno (migration 018). Dal 25 settembre la scadenza la
--    registra il server con la service role (src/lib/orderPayments.ts) e la
--    funzione non è più richiamata dall'applicazione: resta eseguibile solo
--    dalla service role.
--
-- C) pg_trgm fuori dallo schema public (lint 0014)
--    L'estensione non è usata da nessun indice né funzione del repository
--    (creata dalla 001 "per la ricerca"). Si sposta nello schema "extensions".
--    pg_net NON si sposta: la gestisce Supabase e lo script del cron la usa
--    come net.http_post.
--
-- NON TOCCATO, di proposito (vedi HANDOFF.md):
--   · restaurants_public è SECURITY DEFINER per costruzione: è il confine di
--     ciò che è pubblico (decisione 14). Con security_invoker la vetrina
--     tornerebbe vuota, perché `restaurants` è leggibile solo dal proprietario.
--   · is_admin(), my_restaurant_id(), is_published_restaurant(): le usano le
--     policy RLS, che le eseguono con il ruolo di chi interroga; togliere
--     EXECUTE ad anon/authenticated romperebbe le letture pubbliche.
--   · generate_order_number: serve all'utente autenticato (conversione di una
--     prenotazione in ordine dal pannello).
-- ============================================================================

-- A) search_path fisso
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_admin',
        'my_restaurant_id',
        'update_updated_at',
        'guard_order_payment_columns',
        'guard_restaurant_payment_columns',
        'count_customer_orders',
        'generate_order_number'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- B) expire_order: solo la service role
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'expire_order'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- C) pg_trgm nello schema "extensions"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

-- Controllo: search_path impostato, expire_order chiuso, pg_trgm spostata.
SELECT p.proname AS funzione,
       p.proconfig  AS impostazioni,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_puo_eseguire
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'my_restaurant_id', 'update_updated_at',
                    'guard_order_payment_columns', 'guard_restaurant_payment_columns',
                    'count_customer_orders', 'generate_order_number', 'expire_order')
ORDER BY p.proname;

SELECT e.extname AS estensione, n.nspname AS schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('pg_trgm', 'pg_net');
