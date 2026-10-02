-- ============================================================================
-- 026 — VETRINA INDIPENDENTE DALLA VISIBILITÀ DI `restaurants`
-- ============================================================================
--
-- Prima parte della chiusura di N18 (AUDIT_REPORT.md): oggi un utente
-- autenticato qualsiasi legge tutte le colonne dei ristoranti pubblicati,
-- comprese email del titolare, IBAN e partita IVA, perché la policy
-- "restaurants: public read published" vale per tutti i ruoli e la
-- restrizione per colonna della 017 solo per `anon`.
--
-- Una restrizione per colonna per `authenticated` non è praticabile: admin e
-- titolari leggono quelle colonne legittimamente, con lo stesso ruolo. Si
-- limitano invece le RIGHE (migration 027): un utente autenticato vedrà sulla
-- tabella solo il proprio ristorante, o tutti se admin.
--
-- Perché la vetrina continui a funzionare per un utente autenticato che apre
-- il locale di un altro, questa migration:
--
--   1. crea `restaurants_public`, vista delle sole colonne pubbliche dei
--      locali pubblicati, da cui la vetrina legge;
--   2. sostituisce nelle policy pubbliche di menu, categorie, orari, zone e
--      promo la sottoquery su `restaurants` — che dipende da cosa vede chi
--      interroga — con is_published_restaurant(), che non ne dipende.
--
-- Non toglie nulla a nessuno: va applicata PRIMA del deploy del codice che
-- legge dalla vista. La 027, che restringe, va applicata DOPO il deploy.
-- ============================================================================

-- ─── 1. Stato di pubblicazione, indipendente da RLS ────────────────────────

CREATE OR REPLACE FUNCTION public.is_published_restaurant(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
     WHERE id = p_restaurant_id AND status = 'published'
  );
$$;

REVOKE ALL ON FUNCTION public.is_published_restaurant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_restaurant(uuid) TO anon, authenticated, service_role;

-- ─── 2. Policy pubbliche delle tabelle collegate ───────────────────────────
--
-- Stessa semantica di prima: pubblicato, oppure proprio, oppure admin.

DROP POLICY IF EXISTS "menu_items: public read" ON public.menu_items;
CREATE POLICY "menu_items: public read" ON public.menu_items
  FOR SELECT
  USING (
    public.is_published_restaurant(restaurant_id)
    OR restaurant_id = public.my_restaurant_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "menu_categories: public read" ON public.menu_categories;
CREATE POLICY "menu_categories: public read" ON public.menu_categories
  FOR SELECT
  USING (
    public.is_published_restaurant(restaurant_id)
    OR restaurant_id = public.my_restaurant_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "restaurant_hours: public read" ON public.restaurant_hours;
CREATE POLICY "restaurant_hours: public read" ON public.restaurant_hours
  FOR SELECT
  USING (
    public.is_published_restaurant(restaurant_id)
    OR restaurant_id = public.my_restaurant_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "delivery_zones: public read" ON public.delivery_zones;
CREATE POLICY "delivery_zones: public read" ON public.delivery_zones
  FOR SELECT
  USING (
    restaurant_id = public.my_restaurant_id()
    OR public.is_admin()
    OR public.is_published_restaurant(restaurant_id)
  );

DROP POLICY IF EXISTS "promos: public read active" ON public.promos;
CREATE POLICY "promos: public read active" ON public.promos
  FOR SELECT
  USING (
    active = true
    AND (
      restaurant_id = public.my_restaurant_id()
      OR public.is_admin()
      OR public.is_published_restaurant(restaurant_id)
    )
  );

-- ─── 3. Vista pubblica dei ristoranti ──────────────────────────────────────
--
-- In produzione esisteva già una vista con questo nome, creata a mano e in
-- nessuna migration (stessa deriva di N12 e N14), che nessun codice usa. Le
-- sue colonne erano quelle pubbliche più `plan`; nessuna colonna sensibile.
-- La prima versione di questo file usava CREATE OR REPLACE senza `plan` e
-- falliva con "42P16 cannot drop columns from view" (lo script è stato
-- annullato per intero). La vista viene ora ricreata con una definizione
-- esplicita, compreso il filtro sui soli locali pubblicati che per quella
-- esistente non era verificabile, e conserva `plan` per non rompere un
-- eventuale utilizzatore sconosciuto.
--
-- Le stesse colonne che la 017 concede ad `anon`, più `plan`, solo locali
-- pubblicati.
-- È una vista con i privilegi del proprietario (comportamento predefinito):
-- non applica le RLS di `restaurants` a chi la interroga, ed è il motivo per
-- cui esiste. Il filtro sullo stato e l'elenco delle colonne SONO il
-- controllo d'accesso: ogni colonna aggiunta qui diventa pubblica.

DROP VIEW IF EXISTS public.restaurants_public;

CREATE VIEW public.restaurants_public AS
SELECT
  id, name, slug, status, tagline, description,
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
  iban_enabled,
  scheduled_orders, hours_config, tables_count,
  plan,
  published_at, created_at, updated_at
FROM public.restaurants
WHERE status = 'published';

REVOKE ALL ON public.restaurants_public FROM PUBLIC;
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT slug FROM public.restaurants_public;          -- i locali pubblicati
--   SELECT policyname FROM pg_policies
--    WHERE schemaname = 'public'
--      AND qual LIKE '%is_published_restaurant%';         -- 5 righe
