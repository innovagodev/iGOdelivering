import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Durata di validità di un link di attivazione.
 */
export const ACTIVATION_TOKEN_TTL_DAYS = 7;

/**
 * Messaggio unico per token mancante, scaduto, inesistente o già consumato.
 *
 * Deliberatamente indistinguibile fra i casi: un messaggio che dicesse
 * "scaduto" confermerebbe che quel token è esistito davvero, dando a chi prova
 * a indovinarne uno il segnale che serve a capire se sta cercando nel posto
 * giusto. Vedere src/app/api/ristoratore/register/route.ts.
 */
export const ACTIVATION_INVALID_MESSAGE =
  'Link di attivazione non valido o scaduto. Richiedi un nuovo link all’amministratore.';

/**
 * Genera un nuovo token di attivazione per il ristorante, lo salva con la sua
 * scadenza e restituisce il link da consegnare al proprietario.
 *
 * Il token è l'unica credenziale del link: il `restaurant_id` non compare più
 * nell'URL, perché veniva accettato dalla route di registrazione come prova di
 * autorizzazione pur essendo un identificatore visibile a chiunque nel pannello
 * admin e nei link già distribuiti.
 *
 * L'email resta nella query string solo per riempire il campo di conferma nel
 * form: il server non la usa in alcun modo per autorizzare, la ricava dalla
 * riga trovata tramite il token.
 *
 * Ogni chiamata **ruota** il token: i link emessi in precedenza per lo stesso
 * ristorante smettono di funzionare.
 *
 * @param supabaseAdmin client con service role key — `activation_token` non è
 *   leggibile né scrivibile con la chiave anon.
 */
export async function issueActivationLink(
  supabaseAdmin: SupabaseClient,
  restaurant: { id: string; email: string },
  siteUrl: string
): Promise<{ activationLink: string; expiresAt: string } | { error: string }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + ACTIVATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabaseAdmin
    .from('restaurants')
    .update({ activation_token: token, activation_token_expires_at: expiresAt })
    .eq('id', restaurant.id);

  if (error) {
    console.error('[activation] impossibile salvare il token:', error.message);
    return { error: 'Impossibile generare il link di attivazione' };
  }

  const activationLink =
    `${siteUrl}/register?token=${encodeURIComponent(token)}` +
    `&email=${encodeURIComponent(restaurant.email)}`;

  return { activationLink, expiresAt };
}
