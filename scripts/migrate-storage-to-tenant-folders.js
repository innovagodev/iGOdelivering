/**
 * ============================================================================
 * MIGRAZIONE ONE-SHOT — Storage piatto → cartelle per tenant
 * ============================================================================
 *
 * Sposta gli oggetti che oggi stanno nella radice dei bucket
 *
 *   restaurant-logos | restaurant-banners | dish-images
 *
 * sotto una cartella per ristorante:  `<restaurantId>/<nomefile>`
 *
 * Per ogni oggetto, nell'ordine:
 *   1. risolve il restaurantId di appartenenza
 *   2. copia l'oggetto nel nuovo path annidato
 *   3. verifica che la copia esista davvero
 *   4. aggiorna la colonna DB che lo referenzia con il nuovo URL pubblico
 *   5. solo a quel punto cancella il vecchio oggetto
 *
 * Se uno qualsiasi dei passi 2-4 fallisce, il vecchio oggetto NON viene
 * cancellato: si resta con una copia in più (innocua) invece che con un
 * riferimento rotto in vetrina.
 *
 * ----------------------------------------------------------------------------
 * COME SI RISOLVE IL restaurantId
 * ----------------------------------------------------------------------------
 * Due strategie, in ordine di affidabilità:
 *
 *   A) Riferimento DB (esatto). Si indicizzano in anticipo tutte le colonne che
 *      puntano allo storage — restaurants.logo_url, restaurants.background_url,
 *      menu_items.image_url — estraendo da ogni URL il path dell'oggetto. Se
 *      l'oggetto compare nell'indice sappiamo con certezza a chi appartiene e
 *      quale riga aggiornare.
 *
 *   B) Prefisso slug nel nome file (euristica). I nomi storici hanno la forma
 *      `<slug>-<timestamp>-logo.png`. Poiché gli slug possono contenere
 *      trattini, si cerca la corrispondenza con lo slug PIÙ LUNGO fra quelli
 *      esistenti; se due slug diversi matchano con la stessa lunghezza il caso
 *      è ambiguo e l'oggetto viene saltato.
 *
 * Un oggetto risolto solo con (B) non è referenziato da nessuna riga: è un
 * residuo di upload sovrascritti. Spostarlo è sicuro, cancellarlo è
 * irreversibile — quindi di default viene saltato e serve --include-orphans
 * per trattarlo.
 *
 * ----------------------------------------------------------------------------
 * USO
 * ----------------------------------------------------------------------------
 *   node scripts/migrate-storage-to-tenant-folders.js                 # DRY RUN
 *   node scripts/migrate-storage-to-tenant-folders.js --apply
 *   node scripts/migrate-storage-to-tenant-folders.js --apply --include-orphans
 *   node scripts/migrate-storage-to-tenant-folders.js --bucket=dish-images
 *
 * Senza --apply non scrive nulla: elenca soltanto cosa farebbe.
 *
 * Richiede in .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (la service role key serve per scrivere ignorando le RLS).
 *
 * NOTA: questo script non tocca policy RLS o di storage — se ne occupa una
 * migration SQL separata. Va eseguito DOPO che la migration ha messo in campo
 * le nuove policy per-tenant, altrimenti i path nuovi resterebbero comunque
 * accessibili con le regole vecchie.
 *
 * Log completo in scripts/logs/storage-migration-<timestamp>.jsonl
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const BUCKETS = ['restaurant-logos', 'restaurant-banners', 'dish-images'];

/** Quale colonna DB referenzia gli oggetti di ciascun bucket. */
const BUCKET_BINDING = {
  'restaurant-logos': { table: 'restaurants', column: 'logo_url' },
  'restaurant-banners': { table: 'restaurants', column: 'background_url' },
  'dish-images': { table: 'menu_items', column: 'image_url' },
};

const PAGE_SIZE = 1000;

// ─── Argomenti ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const INCLUDE_ORPHANS = args.includes('--include-orphans');
const bucketArg = args.find((a) => a.startsWith('--bucket='));
const TARGET_BUCKETS = bucketArg ? [bucketArg.split('=')[1]] : BUCKETS;

for (const b of TARGET_BUCKETS) {
  if (!BUCKETS.includes(b)) {
    console.error(`Bucket non riconosciuto: "${b}". Ammessi: ${BUCKETS.join(', ')}`);
    process.exit(1);
  }
}

// ─── Env ────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`File .env non trovato in ${envPath}`);
    process.exit(1);
  }
  const env = {};
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) return;
      let value = match[2] || '';
      if (value.length > 1 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value.trim();
    });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY nel file .env.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Logging ────────────────────────────────────────────────────────────────

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(
  logDir,
  `storage-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const ICONS = { INFO: '  ', OK: 'OK', SKIP: '--', WARN: '!!', FAIL: 'XX' };

function log(level, event, detail) {
  const entry = { ts: new Date().toISOString(), level, event, ...detail };
  logStream.write(JSON.stringify(entry) + '\n');
  const bits = [];
  if (detail.bucket) bits.push(detail.bucket);
  if (detail.from) bits.push(detail.from);
  if (detail.to) bits.push(`→ ${detail.to}`);
  if (detail.reason) bits.push(`(${detail.reason})`);
  if (detail.error) bits.push(`ERRORE: ${detail.error}`);
  console.log(`[${ICONS[level] || level}] ${event.padEnd(22)} ${bits.join('  ')}`);
}

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Da un URL pubblico Supabase estrae il path dell'oggetto dentro al bucket.
 * https://xxx.supabase.co/storage/v1/object/public/dish-images/abc/foo.png?t=1
 *   → { bucket: 'dish-images', objectPath: 'abc/foo.png' }
 * Restituisce null se l'URL non è un URL di storage (es. link esterno).
 */
function parseStorageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  let rest = url.slice(idx + marker.length);
  const q = rest.indexOf('?');
  if (q !== -1) rest = rest.slice(0, q);
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  const bucket = rest.slice(0, slash);
  let objectPath = rest.slice(slash + 1);
  try {
    objectPath = decodeURIComponent(objectPath);
  } catch {
    /* path non codificato: si usa così com'è */
  }
  if (!objectPath) return null;
  return { bucket, objectPath };
}

function publicUrlFor(bucket, objectPath) {
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

/** Elenca tutti gli oggetti nella radice di un bucket, paginando. */
async function listRoot(bucket) {
  const entries = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list("${bucket}") fallita: ${error.message}`);
    if (!data || data.length === 0) break;
    entries.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return entries;
}

/** Verifica che un oggetto esista davvero al path indicato. */
async function objectExists(bucket, objectPath) {
  const slash = objectPath.lastIndexOf('/');
  const dir = slash === -1 ? '' : objectPath.slice(0, slash);
  const name = slash === -1 ? objectPath : objectPath.slice(slash + 1);
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(dir, { limit: 1, search: name });
  if (error) return false;
  return !!(data || []).some((e) => e.name === name && e.id !== null);
}

// ─── Indice dei riferimenti DB ──────────────────────────────────────────────

/**
 * Indicizza tutte le colonne che puntano allo storage.
 * Chiave: "<bucket>/<objectPath>" → { table, column, rowId, restaurantId, url }
 */
async function buildDbIndex() {
  const index = new Map();

  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('id, slug, logo_url, background_url');
  if (rErr) throw new Error(`Lettura restaurants fallita: ${rErr.message}`);

  for (const r of restaurants || []) {
    for (const column of ['logo_url', 'background_url']) {
      const parsed = parseStorageUrl(r[column]);
      if (!parsed) continue;
      index.set(`${parsed.bucket}/${parsed.objectPath}`, {
        table: 'restaurants',
        column,
        rowId: r.id,
        restaurantId: r.id,
        url: r[column],
      });
    }
  }

  const { data: items, error: iErr } = await supabase
    .from('menu_items')
    .select('id, restaurant_id, image_url');
  if (iErr) throw new Error(`Lettura menu_items fallita: ${iErr.message}`);

  for (const it of items || []) {
    const parsed = parseStorageUrl(it.image_url);
    if (!parsed) continue;
    index.set(`${parsed.bucket}/${parsed.objectPath}`, {
      table: 'menu_items',
      column: 'image_url',
      rowId: it.id,
      restaurantId: it.restaurant_id,
      url: it.image_url,
    });
  }

  const slugs = (restaurants || [])
    .filter((r) => r.slug)
    .map((r) => ({ id: r.id, slug: r.slug }))
    .sort((a, b) => b.slug.length - a.slug.length); // più lungo prima

  return { index, slugs, restaurantCount: (restaurants || []).length };
}

/**
 * Strategia B: risale al ristorante dal prefisso slug nel nome file.
 * Restituisce { restaurantId } oppure { ambiguous } oppure null.
 */
function resolveBySlug(fileName, slugs) {
  const matches = slugs.filter((s) => fileName.startsWith(`${s.slug}-`));
  if (matches.length === 0) return null;
  const best = matches[0].slug.length;
  const tied = matches.filter((m) => m.slug.length === best);
  if (tied.length > 1) return { ambiguous: tied.map((t) => t.slug) };
  return { restaurantId: matches[0].id };
}

// ─── Migrazione di un singolo oggetto ───────────────────────────────────────

async function migrateObject(bucket, entry, dbIndex, slugs, stats) {
  const fileName = entry.name;
  const oldPath = fileName;
  const key = `${bucket}/${oldPath}`;

  // 1. Risolvi il proprietario
  const ref = dbIndex.get(key);
  let restaurantId = ref ? ref.restaurantId : null;
  let orphan = false;

  if (!restaurantId) {
    const bySlug = resolveBySlug(fileName, slugs);
    if (bySlug && bySlug.ambiguous) {
      stats.skipped++;
      log('WARN', 'SLUG_AMBIGUO', {
        bucket,
        from: oldPath,
        reason: `più slug corrispondono: ${bySlug.ambiguous.join(', ')}`,
      });
      return;
    }
    if (!bySlug) {
      stats.skipped++;
      log('SKIP', 'NON_RISOLTO', {
        bucket,
        from: oldPath,
        reason: 'nessun riferimento DB e nessuno slug corrispondente',
      });
      return;
    }
    restaurantId = bySlug.restaurantId;
    orphan = true;

    if (!INCLUDE_ORPHANS) {
      stats.skippedOrphans++;
      log('SKIP', 'ORFANO', {
        bucket,
        from: oldPath,
        reason: `non referenziato in DB; risolto per slug → ${restaurantId}. Usa --include-orphans per spostarlo`,
      });
      return;
    }
  }

  if (ref && ref.restaurantId == null) {
    stats.skipped++;
    log('WARN', 'TENANT_MANCANTE', {
      bucket,
      from: oldPath,
      reason: `riga ${ref.table}:${ref.rowId} senza restaurant_id`,
    });
    return;
  }

  const newPath = `${restaurantId}/${fileName}`;

  if (!APPLY) {
    stats.wouldMigrate++;
    log('INFO', orphan ? 'DRY_RUN_ORFANO' : 'DRY_RUN', {
      bucket,
      from: oldPath,
      to: newPath,
      reason: ref ? `${ref.table}.${ref.column} riga ${ref.rowId}` : 'nessun update DB',
    });
    return;
  }

  // 2. Copia
  const { error: copyErr } = await supabase.storage.from(bucket).copy(oldPath, newPath);
  if (copyErr) {
    // Se la destinazione esiste già da un tentativo precedente proseguiamo.
    const alreadyThere = await objectExists(bucket, newPath);
    if (!alreadyThere) {
      stats.failed++;
      log('FAIL', 'COPIA_FALLITA', { bucket, from: oldPath, to: newPath, error: copyErr.message });
      return;
    }
    log('WARN', 'COPIA_GIA_PRESENTE', { bucket, from: oldPath, to: newPath });
  } else {
    log('OK', 'COPIATO', { bucket, from: oldPath, to: newPath });
  }

  // 3. Verifica prima di qualunque cancellazione
  if (!(await objectExists(bucket, newPath))) {
    stats.failed++;
    log('FAIL', 'VERIFICA_FALLITA', {
      bucket,
      from: oldPath,
      to: newPath,
      error: 'la copia non risulta presente: il vecchio oggetto NON viene cancellato',
    });
    return;
  }

  // 4. Aggiorna il riferimento in DB
  if (ref) {
    const newUrl = publicUrlFor(bucket, newPath);
    const { error: updErr } = await supabase
      .from(ref.table)
      .update({ [ref.column]: newUrl })
      .eq('id', ref.rowId);

    if (updErr) {
      stats.failed++;
      log('FAIL', 'UPDATE_DB_FALLITO', {
        bucket,
        from: oldPath,
        to: newPath,
        error: `${ref.table}.${ref.column} riga ${ref.rowId}: ${updErr.message} — vecchio oggetto conservato`,
      });
      return;
    }
    log('OK', 'DB_AGGIORNATO', {
      bucket,
      to: newPath,
      reason: `${ref.table}.${ref.column} riga ${ref.rowId}`,
    });
  }

  // 5. Cancella il vecchio oggetto
  const { error: delErr } = await supabase.storage.from(bucket).remove([oldPath]);
  if (delErr) {
    stats.failed++;
    log('FAIL', 'DELETE_FALLITO', {
      bucket,
      from: oldPath,
      error: `${delErr.message} — copia nuova e DB sono già a posto, resta un duplicato da rimuovere a mano`,
    });
    return;
  }

  stats.migrated++;
  log('OK', orphan ? 'MIGRATO_ORFANO' : 'MIGRATO', { bucket, from: oldPath, to: newPath });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('='.repeat(78));
  console.log('  Migrazione Storage → cartelle per tenant');
  console.log(`  Modalità:  ${APPLY ? '*** APPLY (scrive e cancella) ***' : 'DRY RUN (sola lettura)'}`);
  console.log(`  Orfani:    ${INCLUDE_ORPHANS ? 'inclusi' : 'saltati (--include-orphans per includerli)'}`);
  console.log(`  Bucket:    ${TARGET_BUCKETS.join(', ')}`);
  console.log(`  Log:       ${logFile}`);
  console.log('='.repeat(78));
  console.log('');

  log('INFO', 'AVVIO', {
    reason: `apply=${APPLY} includeOrphans=${INCLUDE_ORPHANS} buckets=${TARGET_BUCKETS.join('|')}`,
  });

  const { index, slugs, restaurantCount } = await buildDbIndex();
  log('INFO', 'INDICE_DB', {
    reason: `${index.size} riferimenti storage su ${restaurantCount} ristoranti, ${slugs.length} slug`,
  });

  const stats = {
    scanned: 0,
    alreadyNested: 0,
    migrated: 0,
    wouldMigrate: 0,
    skipped: 0,
    skippedOrphans: 0,
    failed: 0,
  };

  for (const bucket of TARGET_BUCKETS) {
    console.log(`\n--- ${bucket} ---`);
    let entries;
    try {
      entries = await listRoot(bucket);
    } catch (e) {
      log('FAIL', 'LIST_FALLITA', { bucket, error: e.message });
      continue;
    }

    for (const entry of entries) {
      // Le "cartelle" tornano come voci con id null: sono già annidate.
      if (entry.id === null || entry.name.includes('/')) {
        stats.alreadyNested++;
        log('SKIP', 'GIA_ANNIDATO', { bucket, from: entry.name });
        continue;
      }
      // Segnaposto creato da Supabase quando si crea una cartella vuota.
      if (entry.name === '.emptyFolderPlaceholder') continue;

      stats.scanned++;
      try {
        await migrateObject(bucket, entry, index, slugs, stats);
      } catch (e) {
        stats.failed++;
        log('FAIL', 'ERRORE_IMPREVISTO', { bucket, from: entry.name, error: e.message });
      }
    }
  }

  console.log('');
  console.log('='.repeat(78));
  console.log('  RIEPILOGO');
  console.log(`   oggetti piatti esaminati ..... ${stats.scanned}`);
  console.log(`   già annidati (saltati) ....... ${stats.alreadyNested}`);
  if (APPLY) {
    console.log(`   migrati ...................... ${stats.migrated}`);
  } else {
    console.log(`   da migrare ................... ${stats.wouldMigrate}`);
  }
  console.log(`   orfani saltati ............... ${stats.skippedOrphans}`);
  console.log(`   non risolti / ambigui ........ ${stats.skipped}`);
  console.log(`   falliti ...................... ${stats.failed}`);
  console.log(`   log .......................... ${logFile}`);
  console.log('='.repeat(78));
  if (!APPLY) {
    console.log('\n  Nessuna modifica effettuata. Rilancia con --apply per eseguire.\n');
  }

  log('INFO', 'FINE', { reason: JSON.stringify(stats) });
  logStream.end();

  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  log('FAIL', 'ERRORE_FATALE', { error: e.message });
  console.error(e);
  logStream.end();
  process.exit(1);
});
