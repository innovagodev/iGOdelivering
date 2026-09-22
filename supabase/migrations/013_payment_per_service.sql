-- Migration to support per-service payment method configurations
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS card_table           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_table           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_delivery      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stripe_pickup        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stripe_table         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS paypal_delivery      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS paypal_pickup        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS paypal_table         BOOLEAN DEFAULT TRUE;
