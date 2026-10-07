import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { adminClient } from '@/lib/orderServer';
import { getStripe } from '@/lib/stripeServer';
import { expireDueRequests } from '@/lib/orderPayments';

/**
 * POST /api/cron/expire-authorizations
 *
 * Fa scadere ordini e prenotazioni che nessuno ha accettato entro la loro
 * scadenza (accept_deadline: 3 minuti a locale aperto, un'ora dopo la prossima
 * apertura per i preordini), in tutti i ristoranti, e annulla le autorizzazioni
 * di carta. È la rete di sicurezza che non dipende da nessuno: senza, con il
 * pannello chiuso e il cliente uscito dalla pagina, l'importo resterebbe
 * bloccato sulla carta fino alla scadenza presso la banca (circa 7 giorni) e
 * la richiesta resterebbe in attesa.
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
  if (!admin) {
    console.error('[cron/expire-authorizations] configurazione mancante');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  // Senza Stripe configurato si fanno scadere comunque contanti, POS e
  // prenotazioni; le autorizzazioni di carta restano per il giro successivo.
  const expired = await expireDueRequests(stripe, admin, undefined, 50);
  return NextResponse.json({ ok: true, expired: expired.orders + expired.bookings, ...expired });
}

export const POST = handle;
export const GET = handle;
