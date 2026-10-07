-- ============================================================================
-- SCARTO AUTOMATICO DELLE AUTORIZZAZIONI SCADUTE (pg_cron + pg_net)
-- ============================================================================
--
-- Ogni minuto chiama /api/cron/expire-authorizations, che annulla su Stripe le
-- autorizzazioni degli ordini online non accettati entro 3 minuti. Senza,
-- l'importo resta bloccato sulla carta del cliente finché nessuno apre il
-- pannello, controlla l'ordine o ne crea uno nuovo.
--
-- NON è una migration: contiene un segreto e un indirizzo che dipendono
-- dall'ambiente. Si esegue a mano, dal SQL Editor, dopo aver sostituito i due
-- valori qui sotto. Va rieseguito (con i valori giusti) per ogni ambiente.
--
-- PRIMA DI ESEGUIRLO
--   1. Genera un segreto lungo e casuale, per esempio:
--        openssl rand -hex 32
--   2. Impostalo come variabile d'ambiente CRON_SECRET dell'hosting (stesso
--      valore) e rifai il deploy: senza, la route risponde 503.
--   3. Abilita le estensioni in Supabase → Database → Extensions:
--      pg_cron e pg_net.
--
-- VALORI DA SOSTITUIRE
--   https://app.igodelivering.it   → indirizzo pubblico dell'ambiente
--   REPLACE_WITH_CRON_SECRET       → il segreto del punto 1
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobid)
  FROM cron.job
 WHERE jobname = 'igo-expire-authorizations';

SELECT cron.schedule(
  'igo-expire-authorizations',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://app.igodelivering.it/api/cron/expire-authorizations',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ─── Verifica ───────────────────────────────────────────────────────────────
--   Job attivo:
--     SELECT jobname, schedule, active FROM cron.job
--      WHERE jobname = 'igo-expire-authorizations';
--
--   Risposte delle ultime chiamate (atteso: status_code 200, body {"ok":true,...}):
--     SELECT id, status_code, content, created
--       FROM net._http_response
--      ORDER BY created DESC LIMIT 5;
--     401 = segreto diverso da CRON_SECRET; 503 = CRON_SECRET non impostato.
--
--   Disattivare:
--     SELECT cron.unschedule('igo-expire-authorizations');
