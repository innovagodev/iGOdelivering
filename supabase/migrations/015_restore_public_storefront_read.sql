-- ============================================================================
-- 015 — RIPRISTINO VETRINA PUBBLICA  (fix d'emergenza)
-- ============================================================================
--
-- PROBLEMA
--   La policy "restaurants: public read published", prevista dalla migration
--   002, non risulta presente nel database in esercizio. Senza di essa un
--   visitatore anonimo riceve zero righe da `restaurants`.
--
--   L'effetto è a cascata: le policy di lettura pubblica di menu_items,
--   menu_categories, restaurant_hours, delivery_zones e promos filtrano tutte
--   con
--       restaurant_id IN (SELECT id FROM restaurants WHERE status='published')
--   e quella sottoquery è a sua volta soggetta alle RLS di `restaurants`.
--   Non vedendo alcun ristorante, l'anonimo non vede nemmeno menu, orari,
--   zone di consegna e promozioni: la vetrina /menu/[slug] resta vuota.
--
-- COSA FA QUESTA MIGRATION
--   Ricrea quella singola policy. Nient'altro. È volutamente minimale perché
--   è un ripristino di servizio: meno cose tocca, meno può fallire.
--
-- ESPOSIZIONE RESIDUA (consapevole e temporanea)
--   Le policy RLS agiscono per riga, non per colonna: la riga diventa
--   leggibile per intero. Al momento della stesura vat_number,
--   online_payment_account, iban_holder, paypal_email e stripe_account_label
--   sono NULL su tutti i ristoranti, quindi l'unico dato personale realmente
--   esposto è `restaurants.email` (indirizzo del proprietario), più owner_id.
--   La migration 017 chiude anche questo, ma richiede prima un deploy
--   dell'applicazione: vedere l'intestazione di quel file.
--
--   >>> Se in futuro vengono popolati i campi bancari PRIMA di aver applicato
--   >>> la 017, quei dati diventano pubblici. Applicare la 017 per tempo.
--
-- REVERSIBILE CON
--   DROP POLICY "restaurants: public read published" ON public.restaurants;
--   (ma la vetrina torna giù)
-- ============================================================================

DROP POLICY IF EXISTS "restaurants: public read published" ON public.restaurants;

CREATE POLICY "restaurants: public read published" ON public.restaurants
  FOR SELECT
  USING (status = 'published');
