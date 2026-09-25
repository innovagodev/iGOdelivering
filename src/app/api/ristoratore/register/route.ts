import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ACTIVATION_INVALID_MESSAGE } from '@/lib/activationToken';

/**
 * Messaggio per il caso in cui la registrazione è fallita E la pulizia non è
 * riuscita. Diverso dagli altri di proposito: qui riprovare non serve a nulla,
 * perché l'utente Auth rimasto occupa già l'email del ristorante.
 */
const ORPHAN_USER_MESSAGE =
  'Attivazione non riuscita e non è stato possibile ripulire la registrazione parziale. ' +
  'Contatta l’amministratore citando questo ristorante: l’account va sbloccato manualmente.';

/**
 * Riconosce l'errore di `createUser` per email già presente in Auth.
 *
 * Supabase lo segnala in modi diversi a seconda della versione: `code`
 * `email_exists`, HTTP 422, oppure solo il messaggio. Li si accetta tutti,
 * perché il costo di un falso negativo è tornare al comportamento di prima
 * (nessuna diagnosi) mentre un falso positivo produce solo una riga di log in
 * più — e comunque solo quando la creazione utente è già fallita.
 */
function isEmailAlreadyRegistered(authError: {
  code?: string;
  status?: number;
  message?: string;
}): boolean {
  if (authError.code === 'email_exists') return true;
  if (authError.status === 422) return true;
  return /already\s+(been\s+)?registered|already\s+exists/i.test(authError.message || '');
}

/**
 * Registra un utente Auth orfano *scoperto* durante un tentativo di
 * attivazione, cioè preesistente e non prodotto da questo tentativo.
 *
 * È il punto in cui il danno diventa visibile: il ristoratore legittimo riceve
 * "A user with this email address has already been registered", un messaggio
 * che non ha alcun rapporto con quello che sta facendo, mentre `owner_id` è
 * ancora NULL e il token resta valido — quindi riprovare sembra sensato e non
 * funzionerà mai. Senza questa riga di log la causa non è ricostruibile da
 * nessuna parte.
 *
 * Rilegge `owner_id` dal database invece di fidarsi del valore letto a inizio
 * richiesta: se nel frattempo qualcuno ha completato l'attivazione, l'utente
 * che occupa l'email è il proprietario legittimo e non un orfano.
 *
 * La rilettura viene ripetuta una volta dopo una breve pausa. Serve a coprire
 * la corsa fra due attivazioni simultanee sullo stesso link: il perdente riceve
 * "already registered" appena il vincitore ha creato l'utente, ma prima che
 * abbia scritto `owner_id`, e senza la seconda lettura segnalerebbe come orfano
 * un'attivazione perfettamente riuscita. Verificato: con quattro richieste in
 * parallelo la sola prima lettura produce un falso positivo.
 *
 * Nessuna pulizia automatica: la rimozione resta manuale.
 */
async function logOrphanDetectedOnCreate(
  supabaseAdmin: SupabaseClient,
  ctx: { email: string; restaurantId: string; authErrorMessage: string }
): Promise<void> {
  const readOwnerId = async (): Promise<{ ownerId: string | null } | { failed: true }> => {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('owner_id')
      .eq('id', ctx.restaurantId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error(
          '[register] impossibile rileggere owner_id per la diagnosi orfano:',
          error.message
        );
      }
      return { failed: true };
    }
    return { ownerId: data.owner_id };
  };

  const first = await readOwnerId();
  if ('failed' in first || first.ownerId) return;

  // Seconda lettura: dà il tempo a un'attivazione concorrente di completare
  // l'assegnazione di owner_id prima di dichiarare l'orfano.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const second = await readOwnerId();
  if ('failed' in second || second.ownerId) return;

  console.error(
    '[register][ORPHAN_AUTH_USER] Utente Auth orfano RILEVATO durante un tentativo di attivazione — ' +
      'NON generato da questo tentativo, era già presente. ' +
      `Esiste un utente Auth con l'email ${ctx.email} mentre il ristorante ${ctx.restaurantId} ` +
      'ha ancora owner_id NULL a due letture distanziate. Causa quasi certa: residuo di un rollback ' +
      'fallito in una registrazione precedente (cercare un [register][ORPHAN_AUTH_USER] anteriore). ' +
      'Finché quell’utente non viene rimosso a mano, nessuna attivazione di questo ristorante potrà ' +
      'riuscire, anche con un token nuovo e valido. Nessuna pulizia automatica è stata tentata. ' +
      JSON.stringify({
        email: ctx.email,
        restaurantId: ctx.restaurantId,
        detectedAt: 'createUser',
        authError: ctx.authErrorMessage,
        at: new Date().toISOString(),
      })
  );
}

/**
 * Annulla una registrazione rimasta a metà, eliminando profilo e utente Auth
 * creati poco prima.
 *
 * Il valore di ritorno di queste due cancellazioni veniva ignorato. Se
 * fallivano, restava un utente Auth registrato con l'email del ristorante
 * mentre `owner_id` era ancora NULL: dal pannello admin il locale sembra
 * semplicemente "non ancora attivato", ma ogni tentativo successivo di
 * attivazione muore su `createUser` con "email already registered". Il
 * ristoratore resta bloccato e la causa è invisibile.
 *
 * Qui ogni passo viene verificato e, se fallisce, produce una riga di log ad
 * alta severità con l'id dell'utente orfano, così il record è recuperabile a
 * mano invece di essere scoperto dal ristoratore che non riesce ad attivarsi.
 *
 * @returns true se la pulizia è andata a buon fine per intero.
 */
async function rollbackPartialRegistration(
  supabaseAdmin: SupabaseClient,
  ctx: {
    userId: string;
    email: string;
    restaurantId: string;
    reason: string;
    /** false quando il profilo non è mai stato creato. */
    deleteProfile: boolean;
  }
): Promise<boolean> {
  const failures: Record<string, string> = {};

  if (ctx.deleteProfile) {
    try {
      const { error } = await supabaseAdmin.from('profiles').delete().eq('id', ctx.userId);
      if (error) failures.profileDelete = error.message;
    } catch (e: any) {
      failures.profileDelete = e?.message || String(e);
    }
  }

  // Va tentata comunque, anche se la cancellazione del profilo è fallita:
  // è l'utente Auth a bloccare le attivazioni future, non il profilo.
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(ctx.userId);
    if (error) failures.authUserDelete = error.message;
  } catch (e: any) {
    failures.authUserDelete = e?.message || String(e);
  }

  if (Object.keys(failures).length === 0) return true;

  console.error(
    '[register][ORPHAN_AUTH_USER] Rollback della registrazione fallito — intervento manuale richiesto. ' +
      `L'utente Auth ${ctx.userId} (${ctx.email}) è rimasto registrato mentre il ristorante ` +
      `${ctx.restaurantId} non ha owner_id: finché non viene rimosso, nessuna attivazione ` +
      'di questo ristorante potrà andare a buon fine. ' +
      JSON.stringify({
        userId: ctx.userId,
        email: ctx.email,
        restaurantId: ctx.restaurantId,
        reason: ctx.reason,
        failures,
        at: new Date().toISOString(),
      })
  );

  return false;
}

/**
 * POST /api/ristoratore/register  { name, password, token }
 *
 * Attiva l'account del proprietario di un ristorante.
 *
 * Il `token` è l'unico identificatore accettato. Prima la route riceveva
 * `restaurantId` e `email` dal client e si limitava a verificare che
 * coincidessero con la riga: entrambi però sono dati pubblici o comunque noti
 * (l'id compare nei link del pannello admin, l'email è quella del locale),
 * quindi chiunque li conoscesse poteva rivendicare l'account di un ristorante
 * non ancora attivato. Ora il restaurantId è derivato lato server dalla riga
 * che possiede quel token, e l'email è quella registrata sul ristorante — il
 * valore inviato dal form non viene usato per autorizzare.
 *
 * Il token è monouso: viene azzerato nella stessa UPDATE che assegna owner_id.
 */
export async function POST(request: Request) {
  try {
    const { name, password, token } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Tutti i campi sono obbligatori' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: ACTIVATION_INVALID_MESSAGE }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Configurazione server mancante (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Risolvi il ristorante a partire dal solo token
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('id, email, owner_id, activation_token_expires_at')
      .eq('activation_token', token)
      .maybeSingle();

    // Token inesistente, già consumato (viene azzerato all'uso), scaduto, o
    // ristorante già rivendicato: stessa risposta per tutti, così un tentativo
    // di indovinare un token non riceve alcun riscontro su quale sia lo stato
    // reale di quello provato.
    const expiresAt = restaurant?.activation_token_expires_at;
    const isExpired = !expiresAt || new Date(expiresAt).getTime() <= Date.now();

    if (restError || !restaurant || isExpired || restaurant.owner_id) {
      if (restError) {
        console.error('[register] errore nel lookup del token:', restError.message);
      }
      return NextResponse.json({ error: ACTIVATION_INVALID_MESSAGE }, { status: 400 });
    }

    // L'email è quella registrata sul ristorante, non quella inviata dal form.
    const email = restaurant.email;
    if (!email) {
      return NextResponse.json(
        { error: 'Ristorante senza email registrata, contatta l’amministratore' },
        { status: 400 }
      );
    }

    // 2. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !authUser.user) {
      if (authError && isEmailAlreadyRegistered(authError)) {
        await logOrphanDetectedOnCreate(supabaseAdmin, {
          email,
          restaurantId: restaurant.id,
          authErrorMessage: authError.message,
        });
      }

      return NextResponse.json(
        { error: authError?.message || "Impossibile creare l'utente in Auth" },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // 3. Create profile entry
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      role: 'ristoratore',
      name,
      email,
    });

    if (profileError) {
      const cleaned = await rollbackPartialRegistration(supabaseAdmin, {
        userId,
        email,
        restaurantId: restaurant.id,
        reason: `profileInsert: ${profileError.message}`,
        deleteProfile: false,
      });

      if (!cleaned) {
        return NextResponse.json({ error: ORPHAN_USER_MESSAGE }, { status: 500 });
      }

      return NextResponse.json(
        { error: profileError.message || 'Impossibile creare il profilo' },
        { status: 400 }
      );
    }

    // 4. Assegna il proprietario e consuma il token nella stessa operazione.
    //
    // I filtri `activation_token` + `owner_id IS NULL` rendono il consumo
    // atomico: se due richieste partono con lo stesso token, la prima azzera il
    // token e la seconda non trova più righe da aggiornare. Il `.select()`
    // serve proprio a distinguere "aggiornata" da "nessuna riga".
    const { data: claimed, error: linkError } = await supabaseAdmin
      .from('restaurants')
      .update({
        owner_id: userId,
        activation_token: null,
        activation_token_expires_at: null,
      })
      .eq('id', restaurant.id)
      .eq('activation_token', token)
      .is('owner_id', null)
      .select('id');

    if (linkError || !claimed || claimed.length === 0) {
      const cleaned = await rollbackPartialRegistration(supabaseAdmin, {
        userId,
        email,
        restaurantId: restaurant.id,
        reason: linkError
          ? `ownerUpdate: ${linkError.message}`
          : 'ownerUpdate: nessuna riga aggiornata (token consumato da un’altra richiesta)',
        deleteProfile: true,
      });

      if (!cleaned) {
        return NextResponse.json({ error: ORPHAN_USER_MESSAGE }, { status: 500 });
      }

      if (linkError) {
        console.error('[register] errore nell’assegnazione del proprietario:', linkError.message);
        return NextResponse.json(
          { error: linkError.message || 'Impossibile associare il proprietario al ristorante' },
          { status: 400 }
        );
      }

      // Nessuna riga aggiornata: il token è stato consumato da un'altra
      // richiesta nel frattempo.
      return NextResponse.json({ error: ACTIVATION_INVALID_MESSAGE }, { status: 400 });
    }

    return NextResponse.json({ success: true, email });
  } catch (err: any) {
    console.error('Error in register-ristoratore API:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno del server' },
      { status: 500 }
    );
  }
}
