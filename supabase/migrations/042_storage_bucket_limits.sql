-- ======================================================
-- Limiti dei bucket di immagini: dimensione massima e solo formati immagine
-- ======================================================
-- Prima i bucket pubblici accettavano qualunque file fino a 50 MB (il limite del
-- piano): un account del ristoratore poteva caricarci PDF, HTML o file enormi che
-- poi venivano serviti dal dominio di Supabase. Il ridimensionamento nel browser
-- (src/lib/imageResize.ts) non è una difesa: si aggira chiamando l'API.
--
-- 10 MB lasciano passare una foto di telefono non ridimensionata (menu e wizard
-- caricano il file così com'è). I file già presenti non vengono toccati.

UPDATE storage.buckets
SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
WHERE id IN ('restaurant-logos', 'restaurant-banners', 'dish-images', 'menu-images');
