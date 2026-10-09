-- ============================================================================
-- 040 — Profilo del ristorante: sito e social, e protezione dei dati d'identità
-- ============================================================================
--
-- DA ESEGUIRE PRIMA del deploy del codice che la usa (release 1.41.0): la
-- vetrina legge le colonne nuove dalla vista restaurants_public, e senza la
-- migration quella lettura fallirebbe.
--
-- A) Colonne nuove, pubbliche come `phone`: sito web, Instagram, Facebook,
--    WhatsApp. Il campo "Sito web" esisteva già nel modulo dell'admin ma non
--    veniva salvato da nessuna parte.
--    I valori li normalizza il server (src/lib/contacts.ts): qui c'è solo un
--    limite di lunghezza.
--
-- B) Vista restaurants_public: stessa definizione della 033 più le quattro
--    colonne in fondo. Il ripiego della vetrina per le bozze legge la tabella
--    con la GRANT per colonna ad `anon` (017): va estesa alle colonne nuove,
--    come fece la 033 per description_en.
--
-- C) Protezione dei dati d'identità. Il ristoratore può già scrivere dal
--    browser la propria riga di `restaurants` (policy "owner write"), quindi
--    anche lo stato di pubblicazione, l'indirizzo web della vetrina (slug),
--    l'email, la partita IVA, il proprietario e il piano. Il nuovo profilo
--    passa da una route server con un elenco di campi consentiti, e questo
--    trigger è la seconda difesa: dal browser quelle colonne le modifica solo
--    l'admin. Il server (service role, funzioni SECURITY DEFINER) passa.
--
-- Per tornare indietro: vedi in fondo.
-- ============================================================================

BEGIN;

-- A) colonne
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS website   TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook  TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp  TEXT;

ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_contacts_length;
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_contacts_length CHECK (
    char_length(COALESCE(website, ''))   <= 300 AND
    char_length(COALESCE(instagram, '')) <= 300 AND
    char_length(COALESCE(facebook, ''))  <= 300 AND
    char_length(COALESCE(whatsapp, ''))  <= 30
  );

COMMENT ON COLUMN public.restaurants.website   IS 'Sito web (https). Pubblico, mostrato nei contatti della vetrina.';
COMMENT ON COLUMN public.restaurants.instagram IS 'Profilo Instagram (https). Pubblico.';
COMMENT ON COLUMN public.restaurants.facebook  IS 'Pagina Facebook (https). Pubblico.';
COMMENT ON COLUMN public.restaurants.whatsapp  IS 'Numero WhatsApp, solo cifre con prefisso internazionale. Pubblico.';

GRANT SELECT (website, instagram, facebook, whatsapp) ON public.restaurants TO anon;

-- B) vista pubblica
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
  published_at, created_at, updated_at,
  website, instagram, facebook, whatsapp
FROM public.restaurants
WHERE status = 'published';

REVOKE ALL ON public.restaurants_public FROM PUBLIC;
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- C) protezione dei dati d'identità
CREATE OR REPLACE FUNCTION public.guard_restaurant_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
BEGIN
  -- Il server passa: service_role e sessioni dirette (postgres).
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  -- L'admin lavora dal browser con il proprio accesso.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS DISTINCT FROM OLD.slug THEN v_changed := v_changed || 'slug'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_changed := v_changed || 'status'; END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN v_changed := v_changed || 'owner_id'; END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN v_changed := v_changed || 'plan'; END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN v_changed := v_changed || 'published_at'; END IF;
  -- Stringa vuota e NULL sono lo stesso "nessun valore".
  IF NULLIF(btrim(COALESCE(NEW.email, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(OLD.email, '')), '') THEN
    v_changed := v_changed || 'email';
  END IF;
  IF NULLIF(btrim(COALESCE(NEW.vat_number, '')), '') IS DISTINCT FROM
     NULLIF(btrim(COALESCE(OLD.vat_number, '')), '') THEN
    v_changed := v_changed || 'vat_number';
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    RAISE EXCEPTION 'Dati modificabili solo dall''amministratore: %',
      array_to_string(v_changed, ', ')
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_restaurant_identity ON public.restaurants;
CREATE TRIGGER guard_restaurant_identity
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.guard_restaurant_identity_columns();

COMMIT;

-- ─── Controllo ──────────────────────────────────────────────────────────────
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'restaurants_public'
  AND column_name IN ('website', 'instagram', 'facebook', 'whatsapp')
ORDER BY column_name;                      -- 4 righe

SELECT tgname AS trigger, tgenabled AS attivo
FROM pg_trigger
WHERE tgrelid = 'public.restaurants'::regclass AND tgname = 'guard_restaurant_identity';  -- 1 riga

-- ─── Per tornare indietro ───────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS guard_restaurant_identity ON public.restaurants;
-- DROP FUNCTION IF EXISTS public.guard_restaurant_identity_columns();
-- (le colonne e la vista si possono lasciare: non danno fastidio)
