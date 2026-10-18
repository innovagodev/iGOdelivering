// Verifica degli helper di URL e degli errori di Auth. Si lancia con `npm run test:lib`
// (Node 24 esegue direttamente i .ts, senza compilazione).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { absoluteUrl, getSiteUrl } = await import('../../src/lib/siteUrl.ts');
const { mapAuthError, AUTH_WEAK_PASSWORD_MESSAGE, AUTH_GENERIC_MESSAGE } = await import(
  '../../src/lib/authErrors.ts'
);

test('absoluteUrl: una sola barra in mezzo, qualunque sia la base', () => {
  for (const base of ['https://x.it', 'https://x.it/', 'https://x.it//']) {
    assert.equal(absoluteUrl('/register?token=a', base), 'https://x.it/register?token=a');
    assert.equal(absoluteUrl('register?token=a', base), 'https://x.it/register?token=a');
    assert.equal(absoluteUrl('//register?token=a', base), 'https://x.it/register?token=a');
  }
});

test('getSiteUrl: toglie le barre finali e gli spazi dalla variabile', () => {
  process.env.NEXT_PUBLIC_SITE_URL = ' https://app.igodelivering.it/ ';
  assert.equal(getSiteUrl(), 'https://app.igodelivering.it');
  assert.equal(
    absoluteUrl('/register?token=a'),
    'https://app.igodelivering.it/register?token=a'
  );
});

test('getSiteUrl: senza variabile usa l’origine della richiesta, mai localhost in produzione', () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(getSiteUrl('https://app.igodelivering.it/'), 'https://app.igodelivering.it');
    assert.equal(getSiteUrl(), 'https://igodelivering.it');
  } finally {
    console.warn = warn;
    process.env.NODE_ENV = previous;
  }
});

test('mapAuthError: password debole (per codice e per testo)', () => {
  assert.equal(mapAuthError({ code: 'weak_password', message: 'x' }), AUTH_WEAK_PASSWORD_MESSAGE);
  assert.equal(
    mapAuthError({
      message: 'Password is known to be weak and easy to guess, please choose a different one.',
    }),
    AUTH_WEAK_PASSWORD_MESSAGE
  );
});

test('mapAuthError: casi comuni', () => {
  assert.match(mapAuthError({ code: 'same_password' }), /diversa da quella attuale/);
  assert.match(mapAuthError({ code: 'email_exists' }), /Esiste già un account/);
  assert.match(mapAuthError({ message: 'User already registered' }), /Esiste già un account/);
  assert.equal(mapAuthError({ message: 'Invalid login credentials' }), 'Email o password non corretti.');
  assert.match(mapAuthError({ code: 'over_email_send_rate_limit' }), /Troppi tentativi/);
  assert.match(mapAuthError({ status: 429 }), /Troppi tentativi/);
  assert.match(mapAuthError({ code: 'email_not_confirmed' }), /confermare/);
  assert.match(mapAuthError({ name: 'AuthRetryableFetchError', message: 'x' }), /Connessione/);
  assert.match(mapAuthError(new TypeError('Failed to fetch')), /Connessione/);
});

test('mapAuthError: errore sconosciuto → messaggio generico, senza mostrare l’originale', () => {
  const error = console.error;
  console.error = () => {};
  try {
    assert.equal(mapAuthError({ message: 'Something exotic broke' }), AUTH_GENERIC_MESSAGE);
    assert.equal(mapAuthError(null), AUTH_GENERIC_MESSAGE);
  } finally {
    console.error = error;
  }
});
