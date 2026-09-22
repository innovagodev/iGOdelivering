-- ============================================================================
-- 016 — RIALLINEAMENTO SCHEMA
-- ============================================================================
--
-- Chiude due rilievi di AUDIT_REPORT.md confermati sul database reale tramite
-- scripts/inspect-schema.sql:
--
--   A7  orders.status non ammette 'expired', ma l'applicazione lo scrive
--       (src/app/menu/[slug]/page.tsx, triggerExpired). L'UPDATE viola il
--       CHECK, fallisce, e l'errore finisce solo in console.error: la scadenza
--       non viene mai persistita. La policy "orders: public update expired"
--       della migration 006 è, di conseguenza, codice morto.
--
--   A14 Zero indici non-PK/UNIQUE su tutto lo schema public: ogni query del
--       pannello e ogni valutazione di policy RLS fa una scansione
--       sequenziale.
--
-- Nessuna delle due modifiche richiede un deploy dell'applicazione: si può
-- applicare in qualunque momento, anche subito dopo la 015.
--
-- NOTA sugli stati non inclusi
--   Il codice usa anche 'accepted' e 'rejected', ma solo in lettura o come
--   stati derivati a runtime (LiveOrderKanban). Gli unici valori realmente
--   scritti su orders.status sono: new (checkout), preparing, delivered,
--   cancelled (pannello) ed expired (timer vetrina). Qui si aggiunge quindi
--   solo 'expired'. Unificare il vocabolario degli stati fra DB, Kanban,
--   tracking ed email resta un intervento a parte.
-- ============================================================================

-- ─── A7 · ammettere lo stato 'expired' ──────────────────────────────────────

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'new', 'pending', 'preparing', 'ready',
    'delivering', 'delivered', 'cancelled', 'expired'
  ));

-- ─── A14 · indici sui percorsi di accesso effettivi ─────────────────────────
-- Colonne scelte a partire dalle query realmente presenti nel codice, non da
-- un elenco teorico.

-- orders: useOrders filtra per restaurant_id + created_at; il Kanban per stato
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON public.orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON public.orders (restaurant_id, status);

-- orders: la pagina di tracking cerca per order_number (senza restaurant_id)
CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders (order_number);

-- orders: "I miei ordini" e la verifica promo first_order filtrano per email
CREATE INDEX IF NOT EXISTS idx_orders_customer_email
  ON public.orders (restaurant_id, customer_email);

-- order_items: sempre caricati in join sull'ordine
CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON public.order_items (order_id);

-- menu: filtri per ristorante e per categoria
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant
  ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category
  ON public.menu_items (category_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant
  ON public.menu_categories (restaurant_id);

-- bookings: la pagina prenotazioni filtra per ristorante e ordina per data
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_date
  ON public.bookings (restaurant_id, date);

-- zone e promozioni
CREATE INDEX IF NOT EXISTS idx_delivery_zones_restaurant
  ON public.delivery_zones (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promos_restaurant_active
  ON public.promos (restaurant_id, active);

-- restaurants: owner_id è usato da my_restaurant_id() e dall'AuthContext ad
-- ogni richiesta; status da tutte le sottoquery delle policy pubbliche.
CREATE INDEX IF NOT EXISTS idx_restaurants_owner
  ON public.restaurants (owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status
  ON public.restaurants (status);

-- restaurant_hours è già coperta da UNIQUE(restaurant_id, day_of_week).
