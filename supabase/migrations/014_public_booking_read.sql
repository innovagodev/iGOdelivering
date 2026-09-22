-- ─────────────────────────────────────────────
-- Abilita la lettura pubblica delle prenotazioni
-- Questo è necessario per permettere ai clienti (non autenticati)
-- di visualizzare lo stato della propria prenotazione nel popup di tracking.
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "bookings: public read" ON public.bookings;
CREATE POLICY "bookings: public read" ON public.bookings
  FOR SELECT USING (true);
