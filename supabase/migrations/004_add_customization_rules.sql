-- Migration to add customization controls to menu_items table
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS customization_enabled BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN IF NOT EXISTS notes_enabled BOOLEAN DEFAULT TRUE NOT NULL;
