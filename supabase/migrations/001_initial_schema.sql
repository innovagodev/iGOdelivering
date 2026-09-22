-- =============================================
-- iGOdelivering — Schema Iniziale
-- =============================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- per ricerca full-text

-- ─────────────────────────────────────────────
-- TABELLA: profiles
-- Estende auth.users con dati specifici del ruolo
-- ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'ristoratore')),
  name        TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: restaurants
-- ─────────────────────────────────────────────
CREATE TABLE public.restaurants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  province        TEXT,
  cap             TEXT,
  vat_number      TEXT,
  category        TEXT,
  tagline         TEXT,
  description     TEXT,
  logo_url        TEXT,
  background_url  TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'suspended')),
  plan            TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  -- Delivery config
  delivery_enabled        BOOLEAN DEFAULT FALSE,
  pickup_enabled          BOOLEAN DEFAULT FALSE,
  table_enabled           BOOLEAN DEFAULT FALSE,
  delivery_fee            NUMERIC(10,2) DEFAULT 0,
  min_order               NUMERIC(10,2) DEFAULT 0,
  free_delivery_threshold NUMERIC(10,2) DEFAULT 0,
  free_delivery_active    BOOLEAN DEFAULT FALSE,
  -- Payment
  card_delivery           BOOLEAN DEFAULT FALSE,
  card_pickup             BOOLEAN DEFAULT FALSE,
  cash_delivery           BOOLEAN DEFAULT FALSE,
  cash_pickup             BOOLEAN DEFAULT FALSE,
  paypal_enabled          BOOLEAN DEFAULT FALSE,
  paypal_connected        BOOLEAN DEFAULT FALSE,
  paypal_email            TEXT,
  stripe_enabled          BOOLEAN DEFAULT FALSE,
  stripe_connected        BOOLEAN DEFAULT FALSE,
  stripe_account_label    TEXT,
  iban_enabled            BOOLEAN DEFAULT FALSE,
  online_payment_account  TEXT,
  iban_holder             TEXT,
  -- Extra config
  scheduled_orders        JSONB DEFAULT '{}'::jsonb,
  hours_config            JSONB DEFAULT '{}'::jsonb,
  tables_count            INTEGER DEFAULT 0,
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: restaurant_hours
-- Orari di apertura per giorno
-- ─────────────────────────────────────────────
CREATE TABLE public.restaurant_hours (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Lun, 6=Dom
  is_open         BOOLEAN DEFAULT TRUE,
  lunch_from      TIME,
  lunch_to        TIME,
  lunch_enabled   BOOLEAN DEFAULT TRUE,
  dinner_from     TIME,
  dinner_to       TIME,
  dinner_enabled  BOOLEAN DEFAULT TRUE,
  UNIQUE(restaurant_id, day_of_week)
);

-- ─────────────────────────────────────────────
-- TABELLA: menu_categories
-- ─────────────────────────────────────────────
CREATE TABLE public.menu_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    SMALLINT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: menu_items
-- ─────────────────────────────────────────────
CREATE TABLE public.menu_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  category_name   TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL,
  original_price  NUMERIC(10,2),
  image_url       TEXT,
  image_alt       TEXT,
  allergens       TEXT[] DEFAULT '{}',
  dish_tags       TEXT[] DEFAULT '{}',
  ingredients     TEXT[] DEFAULT '{}',
  available       BOOLEAN DEFAULT TRUE,
  visibility      TEXT DEFAULT 'always' CHECK (visibility IN ('always', 'hidden', 'scheduled')),
  visibility_from TIME,
  visibility_to   TIME,
  sort_order      SMALLINT DEFAULT 0,
  orders_count    INTEGER DEFAULT 0,
  option_groups   JSONB DEFAULT '[]', -- Array di OptionGroup JSON
  customization_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  notes_enabled   BOOLEAN DEFAULT TRUE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: delivery_zones
-- ─────────────────────────────────────────────
CREATE TABLE public.delivery_zones (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id           UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  radius_km               NUMERIC(10,2),
  min_order               NUMERIC(10,2) DEFAULT 0,
  delivery_fee            NUMERIC(10,2) DEFAULT 0,
  free_delivery_threshold NUMERIC(10,2) DEFAULT 0,
  enabled                 BOOLEAN DEFAULT TRUE,
  caps                    TEXT, -- CAP separati da virgola
  lat                     NUMERIC(10,6),
  lng                     NUMERIC(10,6),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: promos
-- ─────────────────────────────────────────────
CREATE TABLE public.promos (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id             UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code                      TEXT NOT NULL,
  type                      TEXT NOT NULL CHECK (type IN ('percentage','fixed_amount','threshold_based','first_order','free_delivery')),
  value                     NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_subtotal        NUMERIC(10,2),
  active                    BOOLEAN DEFAULT TRUE,
  start_date                DATE,
  end_date                  DATE,
  description               TEXT,
  max_uses                  INTEGER,
  used_count                INTEGER DEFAULT 0,
  custom_banner_text        TEXT,
  applicable_delivery_modes TEXT[] DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, code)
);

-- ─────────────────────────────────────────────
-- TABELLA: orders
-- ─────────────────────────────────────────────
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number    TEXT NOT NULL, -- es. "ORD-20260605-001"
  type            TEXT NOT NULL CHECK (type IN ('domicilio','asporto','tavolo')),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','pending','preparing','ready','delivering','delivered','cancelled')),
  -- Customer info
  customer_name   TEXT,
  customer_email  TEXT,
  customer_phone  TEXT,
  customer_address TEXT,
  table_number    TEXT,
  guests          SMALLINT,
  -- Financials
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee    NUMERIC(10,2) DEFAULT 0,
  discount        NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Promo
  promo_code      TEXT,
  promo_applied   BOOLEAN DEFAULT FALSE,
  -- Scheduling
  scheduled_at    TIMESTAMPTZ,
  notes           TEXT,
  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: order_items
-- ─────────────────────────────────────────────
CREATE TABLE public.order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id        UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  qty                 SMALLINT NOT NULL DEFAULT 1,
  note                TEXT,
  added_ingredients   JSONB DEFAULT '[]',
  removed_ingredients TEXT[] DEFAULT '{}',
  selected_options    JSONB DEFAULT '[]'
);

-- ─────────────────────────────────────────────
-- TABELLA: bookings (prenotazioni tavoli)
-- ─────────────────────────────────────────────
CREATE TABLE public.bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  guests          SMALLINT NOT NULL DEFAULT 2,
  date            DATE NOT NULL,
  time            TIME NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  notes           TEXT,
  pre_order_items JSONB DEFAULT '[]',
  pre_order_total NUMERIC(10,2) DEFAULT 0,
  linked_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABELLA: loyalty_points (Post-Supabase, struttura pronta)
-- ─────────────────────────────────────────────
CREATE TABLE public.loyalty_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_email  TEXT NOT NULL,
  points          INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, customer_email)
);

-- ─────────────────────────────────────────────
-- TABELLA: platform_settings (configurazione globale admin)
-- ─────────────────────────────────────────────
CREATE TABLE public.platform_settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TRIGGER: updated_at automatico
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
