-- ============================================================================
-- 031 — SCADENZA PERIODICA DEGLI ORDINI ONLINE NON PAGATI (pg_cron)
-- ============================================================================
--
-- Ogni 5 minuti chiama expire_unpaid_orders() (migration 030): un ordine
-- online non pagato entro 30 minuti passa a 'expired' e l'eventuale codice
-- promo viene restituito.
--
-- È una rete di sicurezza: il server fa già scadere gli ordini quando riceve
-- nuovi ordini e quando un cliente controlla lo stato del suo. Senza pg_cron
-- un ordine abbandonato in un ristorante senza traffico resterebbe in attesa
-- (fuori dalla cucina, quindi senza danni visibili) fino al prossimo ordine.
--
-- Separata dalla 030 perché richiede l'estensione pg_cron: se il progetto
-- Supabase non la consente, questa migration fallisce da sola senza bloccare
-- il resto. In quel caso si abilita da Database → Extensions → pg_cron e si
-- riesegue.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobid)
  FROM cron.job
 WHERE jobname = 'igo-expire-unpaid-orders';

SELECT cron.schedule(
  'igo-expire-unpaid-orders',
  '*/5 * * * *',
  $$SELECT public.expire_unpaid_orders();$$
);

-- ─── Verifica ───────────────────────────────────────────────────────────────
--   SELECT jobname, schedule, active FROM cron.job
--    WHERE jobname = 'igo-expire-unpaid-orders';
