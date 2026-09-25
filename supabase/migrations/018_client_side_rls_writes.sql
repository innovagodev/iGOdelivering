-- ============================================================================
-- 018 — SCRITTURE LATO CLIENT BLOCCATE DA RLS
-- ============================================================================
--
-- Chiude i rilievi A7 e A8: due UPDATE eseguiti dalla vetrina pubblica con la
-- chiave anon che RLS scarta senza segnalare nulla.
--
-- IL PATTERN
--   PostgREST risponde 204 a un UPDATE che non ha toccato alcuna riga: il
--   client riceve `error: null` e prosegue come se l'operazione fosse andata a
--   buon fine. Confermato con sonda sul database reale:
--
--     UPDATE orders SET status='expired' (chiave anon, senza .select())
--       -> HTTP 204, error null, riga invariata ('new')
--     UPDATE orders SET status='expired' (chiave anon, con .select())
--       -> data [], error null, riga invariata ('new')
--
--   Il secondo caso dimostra che non è un problema di lettura di ritorno: sono
--   proprio zero righe aggiornate.
--
--   Le due cause che verrebbero in mente per prime sono entrambe da escludere:
--   il CHECK constraint ammette già 'expired' (migration 016 applicata, con la
--   service role key lo stesso UPDATE passa), e la policy
--   "orders: public update expired" della migration 006 È presente in
--   produzione — l'ispezione del catalogo la elenca fra le quattro policy di
--   `orders` (cfr. AUDIT_REPORT.md, rilievo C1 e A7).
--
--   Il motivo reale è che in PostgreSQL un UPDATE con clausola WHERE deve anche
--   leggere le righe candidate, e quella lettura passa dalle policy SELECT. Su
--   `orders` le uniche SELECT sono "owner read" e is_admin(), entrambe false per
--   un cliente anonimo: la riga non è individuabile, quindi la policy di UPDATE
--   non arriva mai a essere valutata. È lo stesso meccanismo descritto in A7.
--
-- PERCHÉ UNA FUNZIONE E NON UNA POLICY
--   Una policy di UPDATE per `anon` su orders andrebbe scritta con USING/WITH
--   CHECK abbastanza stretti da impedire qualunque altra modifica, e resterebbe
--   comunque una superficie aperta sulla tabella. Una funzione SECURITY DEFINER
--   espone invece una sola operazione, con la condizione scritta al suo interno
--   e non deducibile o aggirabile dal client.
--
-- ============================================================================

-- ─── A7 · scadenza dell'ordine non confermato ───────────────────────────────
--
-- La vetrina lascia al ristoratore 180 secondi per accettare. Allo scadere il
-- cliente vede "ordine scaduto", ma finora quello stato non raggiungeva mai il
-- database: l'ordine restava 'new' nel pannello del ristoratore, che poteva
-- accettarlo molto dopo, quando per il cliente era già annullato.
--
-- La condizione `status IN ('new','pending')` è la stessa della policy prevista
-- dalla 006 e serve a non sovrascrivere un ordine che il ristoratore ha appena
-- preso in carico: è la corsa che si verifica proprio allo scadere del timer.
-- Il boolean di ritorno distingue "scaduto davvero" da "era già stato accettato",
-- così la UI non può più affermare una scadenza che non è avvenuta.

CREATE OR REPLACE FUNCTION public.expire_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.orders
     SET status = 'expired'
   WHERE id = p_order_id
     AND status IN ('new', 'pending');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.expire_order(uuid) IS
  'Porta un ordine a ''expired'' solo se è ancora ''new'' o ''pending''. '
  'Restituisce TRUE se ha davvero aggiornato la riga, FALSE se l''ordine era '
  'già stato preso in carico. Chiamata dalla vetrina pubblica allo scadere del '
  'timer di conferma.';

REVOKE ALL ON FUNCTION public.expire_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_order(uuid) TO anon, authenticated;

-- ─── A8 · consumo di un codice promozionale ─────────────────────────────────
--
-- `used_count` non è mai stato incrementato dal checkout pubblico: `promos` ha
-- solo "promos: owner write", quindi l'UPDATE anonimo scartava la riga in
-- silenzio. Il limite `max_uses` configurato dal ristoratore era di fatto
-- inefficace, perché il contatore su cui si basa restava fermo a zero.
--
-- L'incremento e il controllo del limite stanno nello stesso UPDATE: in READ
-- COMMITTED, se due checkout concorrenti puntano all'ultimo utilizzo
-- disponibile, il secondo si blocca sul lock di riga e alla ripresa rivaluta la
-- WHERE sulla versione aggiornata, quindi non trova più righe e restituisce
-- FALSE. Leggere used_count e riscriverlo in due passaggi non darebbe questa
-- garanzia.
--
-- `max_uses` nullo o <= 0 significa "nessun limite", coerentemente con il
-- controllo già presente in src/hooks/usePromoCode.ts.

CREATE OR REPLACE FUNCTION public.increment_promo_usage(p_promo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.promos
     SET used_count = COALESCE(used_count, 0) + 1
   WHERE id = p_promo_id
     AND (
       max_uses IS NULL
       OR max_uses <= 0
       OR COALESCE(used_count, 0) < max_uses
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION public.increment_promo_usage(uuid) IS
  'Incrementa promos.used_count di 1 solo se il codice non ha già raggiunto '
  'max_uses (nullo o <= 0 = nessun limite). Controllo e incremento avvengono '
  'nello stesso UPDATE, quindi il limite regge anche con checkout concorrenti. '
  'Restituisce TRUE se l''incremento è avvenuto, FALSE se il limite era esaurito.';

REVOKE ALL ON FUNCTION public.increment_promo_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid) TO anon, authenticated;
