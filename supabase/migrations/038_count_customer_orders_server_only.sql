-- ============================================================================
-- 038 — count_customer_orders eseguibile solo dal server (8 ottobre 2026)
-- ============================================================================
--
-- ⚠️  DA ESEGUIRE SOLO DOPO IL DEPLOY DEL CODICE (release 1.40.0 o successiva).
--     Fino a quel momento la vetrina chiama questa funzione dal browser per
--     verificare i codici sconto "primo ordine": se la si chiude prima del
--     deploy, quei codici smettono di funzionare (la verifica fallisce in
--     modo chiuso, quindi nessuno sconto abusivo, ma nessuno sconto valido).
--
-- PERCHÉ
--   È una funzione di uso interno (risponde "questa email ha già ordinato?")
--   e non deve essere richiamabile dal browser (lint 0028 e 0029 del Security
--   Advisor). Dal codice nuovo la vetrina passa da /api/promo/first-order, che
--   ha un limite di richieste per connessione e risponde solo sì/no. Il
--   controllo al momento dell'ordine (/api/orders) usava già la service role.
--
-- COME VERIFICARE
--   Dopo l'esecuzione, la query in fondo deve dare anon_puo_eseguire = false e
--   authenticated_puo_eseguire = false, service_role_puo_eseguire = true. Poi
--   si prova un codice "primo ordine" dalla vetrina: deve continuare a
--   funzionare.
-- ============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'count_customer_orders'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

SELECT p.proname AS funzione,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_puo_eseguire,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_puo_eseguire,
       has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_role_puo_eseguire
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'count_customer_orders';
