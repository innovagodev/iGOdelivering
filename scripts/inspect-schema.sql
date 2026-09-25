-- ============================================================================
-- iGOdelivering — Ricognizione dello schema reale
-- ============================================================================
--
-- SOLA LETTURA: interroga soltanto i cataloghi di sistema. Non crea, non
-- modifica e non cancella nulla. Si può rieseguire quante volte si vuole.
--
-- USO
--   Dashboard Supabase → SQL Editor → New query → incolla tutto → Run.
--   È una singola istruzione: si incolla e si esegue in un colpo solo.
--   Per esportare il risultato: pulsante "Download CSV" sotto la griglia.
--
-- SCOPO
--   Riconciliare le migration in supabase/migrations/ con il database in
--   esercizio. Le prime righe (sezione DIAGNOSI) rispondono direttamente ai
--   rilievi A5, A7 e A14 di AUDIT_REPORT.md.
--
--   Due sezioni meritano attenzione a ogni esecuzione:
--     POLICY / POLICY_STORAGE — quali RLS sono davvero in vigore
--     PRIVILEGI_anon          — quali COLONNE il ruolo anonimo può leggere.
--                               Le RLS filtrano righe, i GRANT filtrano
--                               colonne: senza questa sezione una restrizione
--                               per colonna può risultare assente pur essendo
--                               stata "applicata" senza errori.
--
-- SE UN BLOCCO DÀ ERRORE DI PERMESSI
--   Elimina il blocco "union all" corrispondente e riesegui il resto. Il
--   valore principale sta nelle sezioni DIAGNOSI, CHECK, INDICI, POLICY e
--   PRIVILEGI_anon. (La sezione PRIVILEGI_anon presuppone che esista il ruolo
--   `anon`: su Supabase c'è sempre, altrove va adattata.)
-- ============================================================================

select sezione, oggetto, dettaglio
from (

  -- ── DIAGNOSI MIRATE ───────────────────────────────────────────────────────
  select 1 as ord,
         'DIAGNOSI'::text as sezione,
         'A7 · orders.status ammette expired?'::text as oggetto,
         coalesce(
           (select case when pg_get_constraintdef(oid) like '%expired%'
                        then 'SI'
                        else 'NO → le scritture di expired falliscono' end
            from pg_constraint
            where conrelid = 'public.orders'::regclass
              and contype = 'c'
              and pg_get_constraintdef(oid) like '%status%'
            limit 1),
           'nessun CHECK su status')::text as dettaglio

  union all
  select 1, 'DIAGNOSI', 'A5 · order_number ha un vincolo UNIQUE?',
         coalesce(
           (select string_agg(pg_get_constraintdef(oid), '  |  ')
            from pg_constraint
            where conrelid = 'public.orders'::regclass
              and contype in ('u','p')
              and pg_get_constraintdef(oid) like '%order_number%'),
           'NO → numeri d''ordine duplicabili')::text

  union all
  select 1, 'DIAGNOSI', 'A14 · numero di indici non-PK/UNIQUE su public',
         (select count(*)::text
          from pg_indexes i
          where i.schemaname = 'public'
            and not exists (select 1 from pg_constraint c
                            where c.conname = i.indexname
                              and c.contype in ('p','u')))

  union all
  select 1, 'DIAGNOSI', 'versione PostgreSQL', (select version())

  -- ── COLONNE (una riga per tabella) ────────────────────────────────────────
  union all
  select 2, 'COLONNE', c.relname::text,
         string_agg(
           a.attname::text || ' ' || format_type(a.atttypid, a.atttypmod)
           || case when a.attnotnull then ' NOT NULL' else '' end,
           ', ' order by a.attnum)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = 'public' and c.relkind = 'r'
  group by c.relname

  -- ── CHECK CONSTRAINT ──────────────────────────────────────────────────────
  union all
  select 3, 'CHECK', conrelid::regclass::text,
         string_agg(conname::text || ': ' || pg_get_constraintdef(oid), '  |  ')
  from pg_constraint
  where contype = 'c' and connamespace = 'public'::regnamespace
  group by conrelid

  -- ── PRIMARY KEY / UNIQUE ──────────────────────────────────────────────────
  union all
  select 4, 'PK_UNIQUE', conrelid::regclass::text,
         string_agg(conname::text || ': ' || pg_get_constraintdef(oid), '  |  ')
  from pg_constraint
  where contype in ('p','u') and connamespace = 'public'::regnamespace
  group by conrelid

  -- ── FOREIGN KEY (mostra anche ON DELETE) ──────────────────────────────────
  union all
  select 5, 'FOREIGN_KEY', conrelid::regclass::text,
         string_agg(conname::text || ': ' || pg_get_constraintdef(oid), '  |  ')
  from pg_constraint
  where contype = 'f' and connamespace = 'public'::regnamespace
  group by conrelid

  -- ── INDICI ────────────────────────────────────────────────────────────────
  union all
  select 6, 'INDICI', tablename::text, string_agg(indexdef, '  |  ')
  from pg_indexes
  where schemaname = 'public'
  group by tablename

  -- ── RLS ATTIVA SÌ/NO ──────────────────────────────────────────────────────
  union all
  select 7, 'RLS_ATTIVA', c.relname::text,
         case when c.relrowsecurity then 'ENABLED' else '*** DISABLED ***' end
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'

  -- ── POLICY SCHEMA public (una riga per policy) ────────────────────────────
  union all
  select 8, 'POLICY', tablename::text || ' · ' || policyname::text,
         cmd::text
         || ' | roles=' || array_to_string(roles, ',')
         || ' | USING('  || coalesce(replace(qual,       chr(10), ' '), '-') || ')'
         || ' | CHECK('  || coalesce(replace(with_check, chr(10), ' '), '-') || ')'
  from pg_policies
  where schemaname = 'public'

  -- ── POLICY SCHEMA storage (base per la migration su A3) ───────────────────
  union all
  select 9, 'POLICY_STORAGE', tablename::text || ' · ' || policyname::text,
         cmd::text
         || ' | roles=' || array_to_string(roles, ',')
         || ' | USING('  || coalesce(replace(qual,       chr(10), ' '), '-') || ')'
         || ' | CHECK('  || coalesce(replace(with_check, chr(10), ' '), '-') || ')'
  from pg_policies
  where schemaname = 'storage'

  -- ── BUCKET DI STORAGE ─────────────────────────────────────────────────────
  union all
  select 10, 'BUCKET', b.id::text, 'public=' || b.public::text
  from storage.buckets b

  -- ── FUNZIONI USATE DALLE POLICY ───────────────────────────────────────────
  union all
  select 11, 'FUNZIONE', p.proname::text,
         replace(pg_get_functiondef(p.oid), chr(10), ' ')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_admin', 'my_restaurant_id', 'update_updated_at')

  -- ── TRIGGER ───────────────────────────────────────────────────────────────
  union all
  select 12, 'TRIGGER', c.relname::text,
         string_agg(t.tgname::text || ': '
                    || replace(pg_get_triggerdef(t.oid), chr(10), ' '), '  |  ')
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
  group by c.relname

  -- ── TABELLE IN REALTIME ───────────────────────────────────────────────────
  union all
  select 13, 'REALTIME', 'supabase_realtime',
         coalesce((select string_agg(tablename::text, ', ')
                   from pg_publication_tables
                   where pubname = 'supabase_realtime'),
                  'nessuna tabella')

  -- ── PRIVILEGI DI COLONNA PER IL RUOLO anon ────────────────────────────────
  -- Le policy RLS filtrano righe; i GRANT filtrano colonne. Questa sezione
  -- esiste perché una restrizione per colonna può essere inefficace senza dare
  -- alcun errore: una REVOKE per colonna non sottrae nulla a una GRANT di
  -- tabella. Qui si vede lo stato effettivo, non quello che si crede di avere.
  union all
  select 14, 'PRIVILEGI_anon', c.relname::text,
         case
           when has_table_privilege('anon', c.oid, 'SELECT')
             then 'SELECT su TUTTA la tabella'
           else 'SELECT solo su: ' || coalesce((
                  select string_agg(a.attname::text, ', ' order by a.attname)
                  from pg_attribute a
                  where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                    and has_column_privilege('anon', c.oid, a.attname, 'SELECT')
                ), '(nessuna colonna)')
         end
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'

) t
order by ord, oggetto;
