-- ============================================================================
-- iGOdelivering — Pulizia dei dati di collaudo (ordini, prenotazioni, eventi)
-- ============================================================================
--
-- COSA CANCELLA
--   · order_items, orders                 tutti gli ordini fatti finora
--   · bookings                            tutte le prenotazioni
--   · stripe_events                       registro degli eventi del webhook
--   · rate_limits                         contatori anti-abuso
--   · order_number_counters (se esiste)   la numerazione riparte da 0001
--   · promos.used_count                   azzerato (gli ordini non esistono più)
--
-- COSA NON TOCCA
--   ristoranti, menu, categorie, zone di consegna, orari, codici sconto,
--   utenti e profili, collegamenti Stripe dei ristoranti.
--
-- ⚠️  È IRREVERSIBILE. Prima di eseguire:
--   1. Se fra gli ordini ci sono ordini veri di clienti (per esempio di un
--      ristorante già in esercizio), NON eseguire così: usa la variante per
--      ristorante qui sotto, oppure esporta prima i dati (SQL Editor → Run
--      "select * from public.orders" → Download CSV).
--   2. Sul piano gratuito di Supabase non ci sono backup automatici.
--   3. I pagamenti di prova restano nel dashboard Stripe in modalità test: non
--      è un problema, e non vanno toccati da qui.
--
-- USO
--   Esegui prima la PARTE A (solo lettura) e controlla i numeri. Poi esegui la
--   PARTE B (cancella) in una query separata.
-- ============================================================================


-- ─── PARTE A — quanto c'è da cancellare (sola lettura) ──────────────────────

SELECT 'orders' AS tabella, count(*) AS righe FROM public.orders
UNION ALL SELECT 'order_items', count(*) FROM public.order_items
UNION ALL SELECT 'bookings', count(*) FROM public.bookings
UNION ALL SELECT 'stripe_events', count(*) FROM public.stripe_events
UNION ALL SELECT 'rate_limits', count(*) FROM public.rate_limits
ORDER BY tabella;

-- Ordini per ristorante, per capire se ce ne sono di veri:
SELECT r.name AS ristorante,
       count(o.*)            AS ordini,
       min(o.created_at)::date AS primo,
       max(o.created_at)::date AS ultimo,
       count(*) FILTER (WHERE o.payment_status IN ('paid', 'partially_refunded', 'refunded')) AS pagati_online
FROM public.restaurants r
LEFT JOIN public.orders o ON o.restaurant_id = r.id
GROUP BY r.name
ORDER BY ordini DESC;


-- ─── PARTE B — cancellazione di TUTTO (esegui solo dopo aver controllato A) ──
-- Seleziona da BEGIN a COMMIT e premi Run.

BEGIN;

DELETE FROM public.order_items;
DELETE FROM public.bookings;
DELETE FROM public.orders;
DELETE FROM public.stripe_events;
DELETE FROM public.rate_limits;

UPDATE public.promos SET used_count = 0 WHERE COALESCE(used_count, 0) <> 0;

DO $$
BEGIN
  IF to_regclass('public.order_number_counters') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.order_number_counters';
  END IF;
END $$;

-- Controllo finale: tutto a zero.
SELECT 'orders' AS tabella, count(*) AS righe FROM public.orders
UNION ALL SELECT 'order_items', count(*) FROM public.order_items
UNION ALL SELECT 'bookings', count(*) FROM public.bookings
UNION ALL SELECT 'stripe_events', count(*) FROM public.stripe_events;

COMMIT;
-- Per annullare invece di confermare, sostituisci COMMIT con ROLLBACK.


-- ─── VARIANTE — cancella solo gli ordini di UN ristorante di prova ──────────
-- Sostituisci il nome e usa questo blocco al posto della PARTE B.
--
-- BEGIN;
-- WITH r AS (SELECT id FROM public.restaurants WHERE name ILIKE '%zz collaudo%')
-- DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE restaurant_id IN (SELECT id FROM r));
-- WITH r AS (SELECT id FROM public.restaurants WHERE name ILIKE '%zz collaudo%')
-- DELETE FROM public.bookings WHERE restaurant_id IN (SELECT id FROM r);
-- WITH r AS (SELECT id FROM public.restaurants WHERE name ILIKE '%zz collaudo%')
-- DELETE FROM public.orders WHERE restaurant_id IN (SELECT id FROM r);
-- COMMIT;
