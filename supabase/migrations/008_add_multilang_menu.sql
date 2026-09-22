-- Colonne EN per menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_en TEXT[] DEFAULT '{}';

-- Colonne EN per menu_categories
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS name_en TEXT;
