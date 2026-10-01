-- ============================================================================
-- 022 — CAPIENZA DELLE PRENOTAZIONI
-- ============================================================================
--
-- Chiude l'overbooking illimitato (rilievo C9 di AUDIT_REPORT.md) con il
-- modello a coperti per fascia ("pacing"): il ristoratore imposta quanti
-- coperti accetta in contemporanea e quanto dura un turno; ogni prenotazione
-- occupa i suoi coperti per la durata del turno.
--
-- booking_capacity NULL = nessun limite automatico. È il default voluto: ogni
-- prenotazione nasce 'pending' e il ristoratore la conferma a mano, quindi
-- senza capienza impostata non c'è overbooking a sua insaputa; un numero
-- predefinito sarebbe sbagliato per quasi tutti i locali.
--
-- Contano le prenotazioni 'pending' e 'confirmed': contando solo le
-- confermate, dieci richieste per la stessa fascia passerebbero tutte.
--
-- CONCORRENZA. Controllo e inserimento avvengono in create_booking(), sotto un
-- advisory lock transazionale per (ristorante, data): due richieste
-- simultanee per lo stesso locale e giorno sono servite in sequenza e la
-- seconda vede la prima. Ristoranti diversi hanno lock diversi e non si
-- attendono mai a vicenda.
--
-- ⚠️ ORDINE DI RILASCIO — va applicata PRIMA del deploy del codice che chiama
-- create_booking da /api/bookings.
-- ============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS booking_capacity integer
    CHECK (booking_capacity IS NULL OR booking_capacity > 0),
  ADD COLUMN IF NOT EXISTS booking_slot_minutes integer NOT NULL DEFAULT 90
    CHECK (booking_slot_minutes BETWEEN 15 AND 480);

COMMENT ON COLUMN public.restaurants.booking_capacity IS
  'Coperti accettati in contemporanea dalle prenotazioni. NULL = nessun limite automatico.';
COMMENT ON COLUMN public.restaurants.booking_slot_minutes IS
  'Durata di un turno: per quanti minuti una prenotazione occupa i suoi coperti.';

-- Nessun GRANT ad anon: la 017 concede per colonna, e la vetrina non ha
-- bisogno di leggere questi valori. Il proprietario li aggiorna tramite la
-- policy "restaurants: owner write".

-- ─── Occupazione di una fascia ──────────────────────────────────────────────
--
-- Picco di coperti occupati durante [p_time, p_time + turno), in minuti
-- interi: l'aritmetica su `time` in PostgreSQL gira a mezzanotte e
-- falserebbe i confronti. Il picco si raggiunge all'inizio dell'intervallo o
-- all'inizio di una prenotazione che cade al suo interno, quindi basta
-- valutare quei punti. Sommare tutte le prenotazioni che si sovrappongono
-- all'intervallo sarebbe più semplice ma sbagliato: due prenotazioni alle
-- 19:00 e alle 20:20 si sovrappongono entrambe a una alle 19:40 senza essere
-- mai contemporanee fra loro.

CREATE OR REPLACE FUNCTION public.booking_peak_covers(
  p_restaurant_id uuid,
  p_date          date,
  p_time          time,
  p_slot_minutes  integer,
  p_exclude_id    uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH t AS (
    SELECT (extract(hour FROM p_time) * 60 + extract(minute FROM p_time))::int AS start_min
  ),
  relevant AS (
    SELECT b.guests,
           (extract(hour FROM b.time) * 60 + extract(minute FROM b.time))::int AS m
    FROM public.bookings b, t
    WHERE b.restaurant_id = p_restaurant_id
      AND b.date = p_date
      AND b.status IN ('pending', 'confirmed')
      AND (p_exclude_id IS NULL OR b.id <> p_exclude_id)
      AND abs((extract(hour FROM b.time) * 60 + extract(minute FROM b.time))::int - t.start_min)
          < p_slot_minutes
  ),
  points AS (
    SELECT start_min AS c FROM t
    UNION
    SELECT r.m FROM relevant r, t WHERE r.m > t.start_min AND r.m < t.start_min + p_slot_minutes
  )
  SELECT COALESCE(max(occ), 0)::int
  FROM (
    SELECT (SELECT COALESCE(sum(r.guests), 0)
              FROM relevant r
             WHERE r.m <= p.c AND p.c < r.m + p_slot_minutes) AS occ
    FROM points p
  ) x;
$$;

-- ─── Creazione atomica ──────────────────────────────────────────────────────

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
BEGIN
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

REVOKE ALL ON FUNCTION public.booking_peak_covers(uuid, date, time, integer, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_peak_covers(uuid, date, time, integer, uuid)
  TO service_role;

-- ─── Verifica ───────────────────────────────────────────────────────────────
--
--   SELECT column_name, data_type, column_default
--     FROM information_schema.columns
--    WHERE table_name = 'restaurants'
--      AND column_name IN ('booking_capacity', 'booking_slot_minutes');
--
--   SELECT p.oid::regprocedure,
--          has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth,
--          has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service
--     FROM pg_proc p
--    WHERE p.pronamespace = 'public'::regnamespace
--      AND p.proname IN ('create_booking', 'booking_peak_covers');
