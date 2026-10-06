import { NextResponse } from 'next/server';
import { getAuthContext, getStripe, resolveRestaurant, siteUrl } from '@/lib/stripeServer';

/**
 * POST /api/stripe/connect
 *
 * Avvia (o riprende) il collegamento del ristorante a Stripe e restituisce
 * l'URL della procedura di Stripe, a cui il pannello reindirizza il titolare.
 *
 * Solo il TITOLARE: la procedura chiede documento d'identità, IBAN e
 * accettazione dei termini di Stripe, che spettano a chi incassa. L'admin
 * non può farla al suo posto (l'invio del link al titolare arriva con la
 * fase 3).
 *
 * L'account viene creato una sola volta (API Accounts v2) e il suo id salvato
 * su `restaurants`; le chiamate successive generano solo un nuovo link,
 * perché quello di Stripe scade in pochi minuti e non va conservato.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    console.error('[stripe/connect] STRIPE_SECRET_KEY mancante');
    return NextResponse.json({ error: 'Pagamenti online non configurati' }, { status: 500 });
  }

  const ctx = await getAuthContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (ctx.role !== 'ristoratore') {
    return NextResponse.json(
      { error: 'Il collegamento a Stripe va completato dal titolare del ristorante.' },
      { status: 403 }
    );
  }

  const resolved = await resolveRestaurant(ctx, null);
  if (!resolved.ok)
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const restaurant = resolved.restaurant;

  let accountId: string | null = restaurant.stripe_account_id;

  if (!accountId) {
    try {
      // Chiave di idempotenza per ristorante e finestra di 10 minuti: due
      // clic ravvicinati non creano due account, ma un ricollegamento
      // successivo (dopo una revoca) ne crea uno nuovo invece di ricevere da
      // Stripe quello revocato.
      const account = await stripe.v2.core.accounts.create(
        {
          contact_email: restaurant.email || undefined,
          display_name: restaurant.name || undefined,
          dashboard: 'full',
          identity: { country: 'it' },
          defaults: {
            responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
            locales: ['it-IT'],
          },
          configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
          metadata: { restaurant_id: restaurant.id },
        },
        { idempotencyKey: `igo-connect-${restaurant.id}-${Math.floor(Date.now() / 600_000)}` }
      );
      accountId = account.id;
    } catch (e: any) {
      console.error('[stripe/connect] creazione account fallita:', restaurant.id, e?.message);
      return NextResponse.json(
        { error: 'Impossibile avviare il collegamento con Stripe. Riprova.' },
        { status: 502 }
      );
    }

    // Salva l'id solo se il ristorante non ne ha già uno: se una richiesta
    // parallela l'ha salvato prima, si usa quello.
    const { data: saved, error: saveError } = await ctx.admin
      .from('restaurants')
      .update({ stripe_account_id: accountId })
      .eq('id', restaurant.id)
      .is('stripe_account_id', null)
      .select('stripe_account_id');
    if (saveError) {
      console.error(
        '[stripe/connect] salvataggio account fallito:',
        restaurant.id,
        accountId,
        saveError.message
      );
      return NextResponse.json(
        { error: 'Impossibile salvare il collegamento. Riprova.' },
        { status: 500 }
      );
    }
    if (!saved || saved.length === 0) {
      const { data: current } = await ctx.admin
        .from('restaurants')
        .select('stripe_account_id')
        .eq('id', restaurant.id)
        .single();
      accountId = current?.stripe_account_id ?? accountId;
    }
  }

  try {
    const base = siteUrl(request);
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId as string,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          refresh_url: `${base}/ristoratore/pagamenti?stripe=refresh`,
          return_url: `${base}/ristoratore/pagamenti?stripe=return`,
        },
      },
    });
    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    console.error('[stripe/connect] creazione link fallita:', accountId, e?.message);
    return NextResponse.json(
      { error: 'Impossibile aprire la procedura di Stripe. Riprova.' },
      { status: 502 }
    );
  }
}
