-- ======================================================
-- Migrazione per la creazione dei bucket di Storage
-- ======================================================

-- Creazione dei bucket se non esistono
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('restaurant-logos', 'restaurant-logos', true),
  ('restaurant-banners', 'restaurant-banners', true),
  ('dish-images', 'dish-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS è solitamente abilitato per impostazione predefinita su storage.objects in Supabase.
-- Creiamo le policy RLS per abilitare l'accesso pubblico in lettura e il caricamento autenticato.

CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('restaurant-logos', 'restaurant-banners', 'dish-images'));

CREATE POLICY "Authenticated Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id IN ('restaurant-logos', 'restaurant-banners', 'dish-images') 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Update Access" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id IN ('restaurant-logos', 'restaurant-banners', 'dish-images') 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated Delete Access" 
ON storage.objects FOR DELETE 
USING (
  bucket_id IN ('restaurant-logos', 'restaurant-banners', 'dish-images') 
  AND auth.role() = 'authenticated'
);
