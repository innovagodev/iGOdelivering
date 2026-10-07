-- ─── Testo del banner promo in inglese ──────────────────────────────────────
--
-- promos.custom_banner_text è il testo libero del banner mostrato in vetrina
-- e finora era solo in italiano. custom_banner_text_en è la versione inglese,
-- facoltativa: se vuota, a chi usa la vetrina in inglese viene mostrato il
-- banner generato in automatico (codice + sconto) invece del testo italiano.
--
-- La vetrina legge `promos` con select('*'): la nuova colonna è visibile con
-- le policy RLS già esistenti, nessun GRANT da aggiungere.

ALTER TABLE public.promos
  ADD COLUMN IF NOT EXISTS custom_banner_text_en TEXT;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'promos' AND column_name = 'custom_banner_text_en';
--   -- 1 riga
