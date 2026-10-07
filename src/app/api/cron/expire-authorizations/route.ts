import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { adminClient } from '@/lib/orderServer';
import { getStripe } from '@/lib/stripeServer';
import { expireDueAuthorizedOrders } from '@/lib/orderPayments';

/**
 * POST /api/cron/expire-authorizations
 *
 * Annulla le autorizzazioni degli ordini online che nessuno ha accettato entro
 * la finestra dei 3 minuti, in tutti i ristoranti. È la rete di sicurezza che
 * non dipende da nessuno: senza, con il pannello chiuso e il cliente uscito
 * dalla pagina, l'importo resterebbe bloccato sulla carta fino alla scadenza
 * dell'autorizzazione presso la banca (circa 7 giorni).
 *
 * Chiamata ogni minuto da pg_cron + pg_net (scripts/cron-expire-authorizations.sql).
 * Protetta da CRON_SECRET: header `Authorization: Bearer <CRON_SECRET>`.
 * Idempotente: gli ordini già chiusi non vengono toccati.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron/expire-authorizations] CRON_SECRET mancante');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const provided = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const admin = adminClient();
  if (!stripe || !admin) {
    console.error('[cron/expire-authorizations] configurazione mancante');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const expired = await expireDueAuthorizedOrders(stripe, admin, undefined, 50);
  return NextResponse.json({ ok: true, expired });
}

export const POST = handle;
export const GET = handle;
