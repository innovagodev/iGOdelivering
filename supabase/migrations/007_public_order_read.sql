-- ─────────────────────────────────────────────
-- Abilita la lettura pubblica degli ordini e dei relativi articoli
-- Questo è necessario per permettere ai clienti (non autenticati)
-- di visualizzare lo stato e il riepilogo del proprio ordine nella pagina di tracking.
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "orders: public read" ON public.orders;
CREATE POLICY "orders: public read" ON public.orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items: public read" ON public.order_items;
CREATE POLICY "order_items: public read" ON public.order_items
  FOR SELECT USING (true);
