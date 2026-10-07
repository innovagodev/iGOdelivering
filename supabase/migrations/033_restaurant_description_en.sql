-- ─── Descrizione del ristorante in inglese ──────────────────────────────────
--
-- La descrizione mostrata in testata della vetrina (restaurants.description)
-- era solo in italiano. description_en è la versione inglese, facoltativa:
-- se vuota la vetrina mostra l'italiano anche a chi usa la lingua inglese.
--
-- La colonna è pubblica come `description`, quindi va esposta in due punti:
--   1. nella vista restaurants_public (da cui legge la vetrina), che si
--      ricrea con la stessa definizione della 028 più description_en;
--   2. nella GRANT per colonna ad `anon` sulla tabella (migration 017), usata
--      dal ripiego della vetrina per le bozze: senza, quella query fallirebbe
--      con "permission denied for column description_en".

BEGIN;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS description_en TEXT;

GRANT SELECT (description_en) ON public.restaurants TO anon;

DROP VIEW IF EXISTS public.restaurants_public;

CREATE VIEW public.restaurants_public AS
SELECT
  id, name, slug, status, tagline, description, description_en,
  address, city, province, cap, phone, category,
  logo_url, background_url,
  delivery_enabled, pickup_enabled, table_enabled,
  delivery_fee, min_order, free_delivery_threshold, free_delivery_active,
  card_delivery, card_pickup, card_table,
  cash_delivery, cash_pickup, cash_table,
  paypal_enabled, paypal_connected,
  paypal_delivery, paypal_pickup, paypal_table,
  stripe_enabled, stripe_connected,
  stripe_delivery, stripe_pickup, stripe_table,
  scheduled_orders, hours_config, tables_count,
  plan,
  published_at, created_at, updated_at
FROM public.restaurants
WHERE status = 'published';

REVOKE ALL ON public.restaurants_public FROM PUBLIC;
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

COMMIT;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'restaurants_public' AND column_name = 'description_en';
--   -- 1 riga
--
--   Con la chiave anon: select('id,description_en') su restaurants_public
--   deve rispondere senza errori.
