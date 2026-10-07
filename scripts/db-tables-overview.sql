-- ============================================================================
-- iGOdelivering — Elenco delle tabelle e delle righe che contengono
-- ============================================================================
--
-- SOLA LETTURA. Una sola istruzione: si incolla nel SQL Editor di Supabase e
-- si esegue. Serve a decidere cosa tenere prima di pulire il database
-- (scripts/db-clean-test-data.sql).
--
-- Colonna `usata_dal_codice`: confronto con le tabelle che il codice
-- dell'applicazione interroga davvero (src/**, .from('…')). Una tabella
-- "no" non è per forza inutile — può servire a una funzione del database —
-- ma è la prima da guardare.
-- ============================================================================

SELECT
  t.table_name AS tabella,
  (xpath(
    '/row/c/text()',
    query_to_xml(format('select count(*) as c from public.%I', t.table_name), false, true, '')
  ))[1]::text::int AS righe,
  pg_size_pretty(pg_total_relation_size(format('public.%I', t.table_name)::regclass)) AS dimensione,
  CASE
    WHEN t.table_name IN (
      'restaurants', 'orders', 'order_items', 'profiles', 'menu_items', 'menu_categories',
      'promos', 'delivery_zones', 'bookings', 'restaurant_hours', 'restaurant_categories',
      'platform_settings', 'restaurant_activation_tokens', 'stripe_events'
    ) THEN 'sì'
    WHEN t.table_name IN ('rate_limits', 'order_number_counters') THEN 'sì, da funzioni del database'
    ELSE 'no'
  END AS usata_dal_codice
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY usata_dal_codice DESC, t.table_name;
