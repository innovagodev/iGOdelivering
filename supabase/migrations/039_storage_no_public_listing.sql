-- ============================================================================
-- 039 — I bucket delle immagini non si possono più elencare dal browser
-- ============================================================================
--
-- Security Advisor, lint 0025 "public_bucket_allows_listing".
--
-- SITUAZIONE PRIMA
--   Su storage.objects c'erano due policy SELECT per tutti ("Public Read Access"
--   su tre bucket e "logos: public read" su restaurant-logos). I bucket sono
--   pubblici: le immagini si vedono dall'URL pubblico anche senza alcuna
--   policy. Le policy servivano solo a una cosa che non serve a nessuno: far
--   elencare a chiunque i file dei bucket.
--
-- COSA FA
--   Toglie le due policy per tutti e ne crea una sola, per l'utente
--   autenticato e solo per la propria cartella (o l'admin). Serve perché
--   src/lib/storage-upload.ts carica con `upsert: true`, e sostituire un file
--   richiede di poterlo leggere: senza questa policy, cambiare un logo già
--   caricato smetterebbe di funzionare.
--
-- NON CAMBIA
--   · Le immagini mostrate in vetrina (URL pubblici /object/public/…): i
--     bucket restano pubblici.
--   · Le policy di insert, update e delete per proprietario (già esistenti).
--
-- COME VERIFICARE
--   1. Dopo l'esecuzione, l'elenco dei file senza accesso torna vuoto.
--   2. Un'immagine in vetrina si vede ancora.
--   3. Da un pannello ristoratore, cambia il logo di un ristorante: deve
--      continuare a funzionare.
--
-- Per tornare indietro: ricrea le due policy come erano (vedi in fondo).
-- ============================================================================

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "logos: public read" ON storage.objects;

DROP POLICY IF EXISTS "tenant storage: owner select" ON storage.objects;
CREATE POLICY "tenant storage: owner select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('restaurant-logos', 'restaurant-banners', 'dish-images')
    AND (
      (storage.foldername(name))[1] = (public.my_restaurant_id())::text
      OR public.is_admin()
    )
  );

-- Controllo: policy SELECT rimaste su storage.objects.
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'SELECT'
ORDER BY policyname;

-- ─── Per tornare indietro ───────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "tenant storage: owner select" ON storage.objects;
-- CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT TO public
--   USING (bucket_id = ANY (ARRAY['restaurant-logos', 'restaurant-banners', 'dish-images']));
-- CREATE POLICY "logos: public read" ON storage.objects FOR SELECT TO public
--   USING (bucket_id = 'restaurant-logos');
