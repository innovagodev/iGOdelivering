-- Add EN columns for allergens and dish tags in menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS allergens_en TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dish_tags_en TEXT[] DEFAULT '{}';
