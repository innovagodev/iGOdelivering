-- ============================================================================
-- 036 — LE PRENOTAZIONI NON POSSONO ESSERE RETROATTIVE (anche nel database)
-- ============================================================================
--
-- /api/bookings rifiuta già le prenotazioni per un giorno o un orario passati
-- (ora di Roma). Questa migration ripete il controllo dentro create_booking(),
-- l'unico punto che scrive in `bookings`, così non dipende dal fatto che
-- chiunque chiami la funzione con la service role key abbia fatto il
-- controllo prima.
--
-- Stessa regola della route: giorno precedente a oggi → rifiutata; oggi con un
-- orario trascorso da più di 5 minuti → rifiutata. Il confronto è in minuti
-- interi, non su `time`: sottrarre 5 minuti a 00:03 darebbe 23:58 e farebbe
-- rifiutare ogni prenotazione per oggi nei primi minuti dopo mezzanotte.
--
-- La funzione risponde {"ok": false, "reason": "past"}, come per "full".
--
-- Si sostituisce solo la funzione (022); permessi invariati.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_booking(
  p_restaurant_id   uuid,
  p_name            text,
  p_phone           text,
  p_email           text,
  p_guests          integer,
  p_date            date,
  p_time            time,
  p_notes           text,
  p_pre_order_items jsonb,
  p_pre_order_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_slot     integer;
  v_peak     integer;
  v_id       uuid := gen_random_uuid();
  v_created  timestamptz;
  v_now      timestamp := (now() AT TIME ZONE 'Europe/Rome');
  v_now_min  integer;
  v_slot_min integer;
BEGIN
  v_now_min  := extract(hour from v_now)::integer * 60 + extract(minute from v_now)::integer;
  v_slot_min := extract(hour from p_time)::integer * 60 + extract(minute from p_time)::integer;

  IF p_date < v_now::date OR (p_date = v_now::date AND v_slot_min < v_now_min - 5) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'past');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || '|' || p_date::text, 0));

  SELECT booking_capacity, booking_slot_minutes
    INTO v_capacity, v_slot
    FROM public.restaurants
   WHERE id = p_restaurant_id;

  IF v_capacity IS NOT NULL THEN
    v_peak := public.booking_peak_covers(p_restaurant_id, p_date, p_time, v_slot);
    IF v_peak + p_guests > v_capacity THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'full',
        'available', GREATEST(v_capacity - v_peak, 0)
      );
    END IF;
  END IF;

  INSERT INTO public.bookings (
    id, restaurant_id, name, phone, email, guests, date, time, status, notes,
    pre_order_items, pre_order_total
  ) VALUES (
    v_id, p_restaurant_id, p_name, p_phone, NULLIF(p_email, ''), p_guests, p_date, p_time,
    'pending', p_notes, p_pre_order_items, p_pre_order_total
  )
  RETURNING created_at INTO v_created;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'created_at', v_created);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, text, text, text, integer, date, time, text, jsonb, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, text, text, text, integer, date, time, text, jsonb, numeric)
  TO service_role;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--   select public.create_booking(<ristorante>, 'Prova', '3330000000', '', 2,
--          current_date - 1, '20:00', '', '[]'::jsonb, 0);
--   atteso: {"ok": false, "reason": "past"}
