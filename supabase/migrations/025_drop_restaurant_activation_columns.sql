-- ============================================================================
-- 025 — RIMOZIONE DELLE VECCHIE COLONNE DEL TOKEN DI ATTIVAZIONE
-- ============================================================================
--
-- ⚠️ Da applicare SOLO DOPO il deploy del codice che usa
-- restaurant_activation_tokens (migration 024). Applicata prima, la
-- registrazione dei ristoratori e l'emissione dei link si fermano.
--
-- Chiude l'esposizione di N18: finché le colonne esistono, un utente
-- autenticato può leggerne i valori sui ristoranti pubblicati. L'indice
-- univoco della 019 viene eliminato insieme alla colonna.
-- ============================================================================

ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS activation_token,
  DROP COLUMN IF EXISTS activation_token_expires_at;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'restaurants' AND column_name LIKE 'activation_token%';
--   -- atteso: nessuna riga
