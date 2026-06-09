-- ─────────────────────────────────────────────
-- Abilita RLS su tutte le tabelle
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_hours  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper: controlla se l'utente è admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: ottieni restaurant_id del ristoratore corrente
CREATE OR REPLACE FUNCTION my_restaurant_id()
RETURNS UUID AS $$
  SELECT id FROM public.restaurants
  WHERE owner_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- profiles: ogni utente legge/scrive solo il proprio profilo
-- ─────────────────────────────────────────────
CREATE POLICY "profiles: self read" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles: self insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: admin all" ON public.profiles
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────
-- restaurants: ristoratore vede solo il suo, admin vede tutti
-- ─────────────────────────────────────────────
CREATE POLICY "restaurants: owner read" ON public.restaurants
  FOR SELECT USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "restaurants: owner write" ON public.restaurants
  FOR UPDATE USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "restaurants: admin insert" ON public.restaurants
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "restaurants: admin delete" ON public.restaurants
  FOR DELETE USING (is_admin());

-- Public read per le vetrine (slug pubblici)
CREATE POLICY "restaurants: public read published" ON public.restaurants
  FOR SELECT USING (status = 'published');

-- ─────────────────────────────────────────────
-- menu_items: pubblico per vetrina, ristoratore gestisce i suoi
-- ─────────────────────────────────────────────
CREATE POLICY "menu_items: public read" ON public.menu_items
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'published')
    OR restaurant_id = my_restaurant_id()
    OR is_admin()
  );

CREATE POLICY "menu_items: owner write" ON public.menu_items
  FOR ALL USING (restaurant_id = my_restaurant_id() OR is_admin());

-- menu_categories, restaurant_hours, delivery_zones, promos
CREATE POLICY "menu_categories: public read" ON public.menu_categories
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'published')
    OR restaurant_id = my_restaurant_id()
    OR is_admin()
  );

CREATE POLICY "menu_categories: owner" ON public.menu_categories
  FOR ALL USING (restaurant_id = my_restaurant_id() OR is_admin());

CREATE POLICY "restaurant_hours: public read" ON public.restaurant_hours
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'published')
    OR restaurant_id = my_restaurant_id()
    OR is_admin()
  );

CREATE POLICY "restaurant_hours: owner" ON public.restaurant_hours
  FOR ALL USING (restaurant_id = my_restaurant_id() OR is_admin());

CREATE POLICY "delivery_zones: public read" ON public.delivery_zones
  FOR SELECT USING (
    restaurant_id = my_restaurant_id() 
    OR is_admin()
    OR restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'published')
  );

CREATE POLICY "delivery_zones: owner write" ON public.delivery_zones
  FOR ALL USING (restaurant_id = my_restaurant_id() OR is_admin());

CREATE POLICY "promos: public read active" ON public.promos
  FOR SELECT USING (
    active = TRUE
    AND (
      restaurant_id = my_restaurant_id() 
      OR is_admin()
      OR restaurant_id IN (SELECT id FROM public.restaurants WHERE status = 'published')
    )
  );

CREATE POLICY "promos: owner write" ON public.promos
  FOR ALL USING (restaurant_id = my_restaurant_id() OR is_admin());

-- ─────────────────────────────────────────────
-- orders: ristoratore vede solo i propri, inserimento pubblico (checkout)
-- ─────────────────────────────────────────────
CREATE POLICY "orders: public insert" ON public.orders
  FOR INSERT WITH CHECK (TRUE); -- Chiunque può creare un ordine

CREATE POLICY "orders: owner read" ON public.orders
  FOR SELECT USING (restaurant_id = my_restaurant_id() OR is_admin());

CREATE POLICY "orders: owner update" ON public.orders
  FOR UPDATE USING (restaurant_id = my_restaurant_id() OR is_admin());

CREATE POLICY "order_items: public insert" ON public.order_items
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "order_items: owner read" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE restaurant_id = my_restaurant_id())
    OR is_admin()
  );

-- ─────────────────────────────────────────────
-- bookings: inserimento pubblico (vetrina), gestione del ristoratore
-- ─────────────────────────────────────────────
CREATE POLICY "bookings: public insert" ON public.bookings
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "bookings: owner all" ON public.bookings
  FOR ALL USING (restaurant_id = my_restaurant_id() OR is_admin());

-- ─────────────────────────────────────────────
-- platform_settings: lettura pubblica, scrittura solo admin
-- ─────────────────────────────────────────────
CREATE POLICY "platform_settings: public select" ON public.platform_settings
  FOR SELECT USING (true);

CREATE POLICY "platform_settings: admin write" ON public.platform_settings
  FOR ALL USING (is_admin());
