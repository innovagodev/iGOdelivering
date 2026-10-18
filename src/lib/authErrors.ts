/**
 * Traduzione degli errori di Supabase Auth in messaggi italiani.
 *
 * Supabase risponde in inglese ("Password is known to be weak and easy to
 * guess…"): l'utente non deve vederli. Si legge prima `code`, che è stabile, e
 * solo se manca si ripiega sul testo del messaggio. Un errore sconosciuto non
 * viene mai mostrato: va in console e l'utente riceve un messaggio generico.
 *
 * Vale sia nel browser sia nelle route server (la registrazione del
 * ristoratore chiama `auth.admin.createUser` sul server).
 */

export const AUTH_WEAK_PASSWORD_MESSAGE =
  'Password troppo debole o già comparsa in violazioni di dati. ' +
  'Scegline una diversa, di almeno 8 caratteri, con lettere, numeri e simboli.';

export const AUTH_GENERIC_MESSAGE = 'Operazione non riuscita. Riprova.';

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

const BY_CODE: Record<string, string> = {
  weak_password: AUTH_WEAK_PASSWORD_MESSAGE,
  same_password: 'La nuova password deve essere diversa da quella attuale.',
  user_already_exists: 'Esiste già un account con questa email.',
  email_exists: 'Esiste già un account con questa email.',
  invalid_credentials: 'Email o password non corretti.',
  over_request_rate_limit: 'Troppi tentativi. Riprova tra qualche minuto.',
  over_email_send_rate_limit: 'Troppi tentativi. Riprova tra qualche minuto.',
  email_not_confirmed: 'Devi prima confermare l’email.',
};

const BY_MESSAGE: Array<[RegExp, string]> = [
  [/weak and easy to guess|pwned|password.*(too short|weak)/i, AUTH_WEAK_PASSWORD_MESSAGE],
  [/different from the old password|same as the old password/i, BY_CODE.same_password],
  [/already\s+(been\s+)?registered|already\s+exists/i, BY_CODE.user_already_exists],
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/rate limit|too many requests/i, BY_CODE.over_request_rate_limit],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
];

const NETWORK_MESSAGE = 'Connessione non riuscita. Controlla la rete e riprova.';

function isNetworkError(error: AuthErrorLike): boolean {
  return (
    error.name === 'AuthRetryableFetchError' ||
    (error.status === 0 && !error.code) ||
    /failed to fetch|fetch failed|network\s?error|networkerror|load failed/i.test(
      error.message || ''
    )
  );
}

export function mapAuthError(error: unknown): string {
  const e: AuthErrorLike =
    error && typeof error === 'object'
      ? (error as AuthErrorLike)
      : { message: typeof error === 'string' ? error : undefined };

  if (e.code && BY_CODE[e.code]) return BY_CODE[e.code];
  if (isNetworkError(e)) return NETWORK_MESSAGE;
  if (e.status === 429) return BY_CODE.over_request_rate_limit;

  const message = e.message || '';
  for (const [pattern, translated] of BY_MESSAGE) {
    if (pattern.test(message)) return translated;
  }

  console.error('[auth] errore non mappato:', error);
  return AUTH_GENERIC_MESSAGE;
}
