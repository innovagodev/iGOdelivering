# iGOdelivering — indicazioni per chi lavora sul codice

Piattaforma di ordini, consegne e prenotazioni per ristoranti. Interfaccia e messaggi in **italiano** (con inglese per la vetrina, via `LanguageContext`); commenti nel codice in italiano.

## Stack e comandi

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3.4 · Supabase · Stripe Connect · GSAP · Lenis.

```bash
npm run dev          # http://localhost:4028
npm run type-check   # tsc --noEmit: va tenuto pulito
npm run build        # prebuild aggiorna src/version.json
npm run release      # standard-version (changelog, versione, tag): `-- --release-as minor` per forzare
```

Dopo `npm run release` si committa `src/version.json` (come "update version.json") e si pubblica con `git push --follow-tags origin main`.

Commit in stile *conventional commits* (`fix(vetrina): …`, `refactor(pannelli): …`): il changelog li legge. `fix` e `feat` finiscono nel changelog, `refactor` e `chore` no.

## Tre aree dell'app

| Area | Percorso | Chi la usa |
|---|---|---|
| Vetrina pubblica | `src/app/menu/[slug]` | cliente, quasi sempre da telefono |
| Pannello ristoratore | `src/app/ristoratore` | ristorante, tablet e laptop sempre acceso |
| Pannello admin | `src/app/admin` | amministratore, desktop e laptop |

## Pannelli: un solo guscio

`src/components/layout/PanelShell.tsx` monta **una volta sola** sidebar e topbar; lo usano `ristoratore/layout.tsx` e `admin/layout.tsx` (che lascia fuori `/admin`, l'accesso). Una pagina nuova **non** disegna né sidebar né topbar:

```tsx
<div className="flex flex-1 min-h-0 min-w-0 bg-background overflow-hidden relative">
  <div className="flex-1 flex flex-col min-w-0 min-h-0">
    <PageTopbar left={/* titolo */} right={/* azioni */} />
    <main className="flex-1 min-h-0 overflow-y-auto">…</main>
  </div>
</div>
```

Una pagina nuova del ristoratore va aggiunta anche a `validRistoratoreRoutes` in `src/middleware.ts`: ciò che non è nell'elenco rimanda alla dashboard.

La voce attiva della sidebar segue l'URL. La sidebar è un drawer sotto 1024px, compressa tra 1024 e 1280px, espansa da 1280px; la scelta dell'utente (`STORAGE_KEYS.SIDEBAR_COLLAPSED`) vince su tutte le pagine.

## Responsive: regole da rispettare

Si ragiona su **telefono (360–430px), tablet in verticale (768–834) e in orizzontale (1024–1180), laptop (1366–1536), desktop (1920+)**.

- **Altezze: `dvh`, non `vh`** (`h-dvh`, `max-h-[90dvh]`). Le parti fisse in basso usano `env(safe-area-inset-bottom)`.
- **Misure dal DOM, non scritte a mano.** La vetrina pubblica `--header-h` e `--sticky-offset` con un `ResizeObserver`; non rimettere offset fissi (`-140`, `4.5rem`, `9rem`).
- **Una sola istanza di Lenis**, quella di `LenisProvider`, che si legge con `useLenisRef()`. Non crearne altre.
- **Comandi toccabili.** Su tablet i comandi stanno sopra i 40–44px: classe `.touch-target` e regole `.panel-shell` in `globals.css` (valgono solo con `pointer: coarse`). I pulsanti posizionati in `absolute` sono esclusi dalle regole globali: se servono più grandi, dare loro un'area di tocco con `before:-inset-2`.
- **Niente comandi solo-hover.** Un comando che compare con `group-hover:opacity-100` non esiste su un tablet.
- **Testo minimo 11px** (`text-[11px]`); i campi sotto i 640px stanno a 16px nella vetrina (`.storefront`) per evitare lo zoom di iOS.
- **Tailwind 3.4 non ha i mezzi passi oltre 3.5**: `w-5.5`, `h-6.5` non generano nulla e il pulsante collassa. Usare `w-[1.375rem]` o un passo intero.
- **Layout dal contenitore, non dallo schermo**, quando la sidebar cambia lo spazio disponibile (esempio: `LiveOrderKanban` misura il proprio pannello e passa da tre colonne alle schede sotto 800px).
- Larghezze dei campi orario e simili: lasciare `flex-wrap` e non affiancare due blocchi larghi sotto `xl`.

Prima di chiudere una modifica di interfaccia, guardarla almeno a 390, 768, 1024 e 1366px, con la sidebar compressa ed espansa nei pannelli.

## Dati e pagamenti: principi

- **Prezzi, sconti e totali li calcola il server** (`/api/orders`), mai il browser. Le scritture sulle tabelle sensibili passano da route server o funzioni `SECURITY DEFINER`, non da policy che lasciano scrivere il client.
- **Una query anon che torna vuota non significa "non esiste"**: con RLS può significare "non puoi vederlo". Chi interpreta il vuoto come stato legittimo produce guasti silenziosi.
- **Orari e preavvisi** stanno in `src/lib/serviceHours.ts`, condivisi tra vetrina e server; non confrontare orari come stringhe.
- **La regola di accettazione** di ordini e prenotazioni è una sola e vive in `src/lib/acceptance.ts`.
- **KPI e grafici** usano `src/lib/dashboardStats.ts`: "oggi" è il giorno di Roma, gli ordini annullati/rifiutati/scaduti non contano, la variazione si confronta con ieri alla stessa ora e compare solo se il confronto è maggiore di zero. Mai percentuali o numeri scritti nel codice; si prova sempre il caso "zero ordini".
- **Carico.** I clienti non aprono canali Realtime (tetto di connessioni del piano): chi aspetta usa `startAdaptivePolling` (`src/lib/polling.ts`). Gli elenchi che possono superare 1000 righe si leggono con `fetchAllPages` (`src/lib/fetchAll.ts`): PostgREST taglia a 1000 senza avvisare.
- **Contatti pubblici e profilo.** Sito, social e WhatsApp si validano e normalizzano con `src/lib/contacts.ts` (solo `https`, domini verificati); un valore del database non diventa mai un `href` senza `safeHttpsHref`. Il ristoratore modifica il proprio profilo solo da `PATCH /api/ristoratore/profilo` (elenco chiuso di campi); `slug`, `email`, `vat_number`, `status`, `owner_id`, `plan` sono dell'admin (trigger `guard_restaurant_identity`). Nella testata della vetrina (`StorefrontHero`) **non si aggiungono file di pulsanti**: i contatti stanno dietro l'unico pulsante "Contatti". L'anteprima del Profilo è la **vetrina vera** (`/menu/<slug>?preview=1`) in un iframe che riceve i valori non salvati con `postMessage` (`src/lib/profilePreview.ts`; l'hook `useRestaurantSettings` li sovrascrive solo in anteprima): ogni campo nuovo del profilo che compare in vetrina va aggiunto a `PREVIEW_FIELDS`. Le immagini caricate si ridimensionano e comprimono prima (`src/lib/imageResize.ts`): la vetrina le serve così come sono.
- **Campi numerici.** Un campo `type="number"` è già protetto da `NumberInputGuard` (niente e/+/-, niente rotellina, ritorno a min/max). Telefono, partita IVA (11 cifre), CAP, provincia e numero tavolo si filtrano con `src/lib/fields.ts` mentre si scrive, **e si ricontrollano sul server**. Il campo "Sito web" propone `https://` al click.
- **Notifiche e conferme** da `src/lib/notify.ts`: niente `alert()` né `confirm()` nativi.
- Ogni migration che aggiunge colonne si applica **prima** del deploy del codice che le scrive.

## Cosa non committare

- `.env` (esiste `.env.example` con i segnaposto) e qualunque chiave o password.
- La cartella `docs/` e gli script operativi in `scripts/ops/`: sono interni, ignorati da Git e non vanno aggiunti con `git add -f`.
