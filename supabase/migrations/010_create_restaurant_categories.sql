-- ======================================================
-- Migrazione per la creazione della tabella Categorie Ristorante
-- ======================================================

CREATE TABLE IF NOT EXISTS public.restaurant_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);



-- Abilita RLS
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;

-- Categorie leggibili da chiunque (pubbliche)
CREATE POLICY "Public Read restaurant_categories" 
ON public.restaurant_categories FOR SELECT 
USING (true);

-- Categorie inseribili dagli utenti autenticati
CREATE POLICY "Authenticated Insert restaurant_categories" 
ON public.restaurant_categories FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
