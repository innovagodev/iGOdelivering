# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.35.1](https://github.com/innovagodev/iGOdelivering/compare/v1.35.0...v1.35.1) (2026-10-07)

## [1.35.0](https://github.com/innovagodev/iGOdelivering/compare/v1.34.0...v1.35.0) (2026-10-07)


### Features

* **ui:** toast e conferme al posto di alert e confirm del browser ([6279db2](https://github.com/innovagodev/iGOdelivering/commit/6279db25bfbbb98e53a41938c500073ef63cccf3))


### Bug Fixes

* **admin:** Pubblica Ristorante nella configurazione ora imposta lo stato published ([9277028](https://github.com/innovagodev/iGOdelivering/commit/92770283729f7a2963162b3cfa38acbf6fe9f5e6))
* **i18n:** "Consegna" nella hero della vetrina tradotto in inglese ([e5d10ac](https://github.com/innovagodev/iGOdelivering/commit/e5d10ac84e4bb1f0d78f02a61061cfbec937e37f))
* **vetrina:** navbar senza spazio sopra allo scroll con locale chiuso ([6f171a0](https://github.com/innovagodev/iGOdelivering/commit/6f171a012399886e492e3307f5d1868d68f51533))

## [1.34.0](https://github.com/innovagodev/iGOdelivering/compare/v1.33.0...v1.34.0) (2026-10-07)


### Features

* **i18n:** menu vetrina completo in inglese, traduzioni facoltative ([6f62317](https://github.com/innovagodev/iGOdelivering/commit/6f62317722714485745ce71af80ca283e878311b))

## [1.33.0](https://github.com/innovagodev/iGOdelivering/compare/v1.32.0...v1.33.0) (2026-10-07)


### Features

* **checkout:** pagamento online con Stripe Payment Element (fase 4) ([50a2b4b](https://github.com/innovagodev/iGOdelivering/commit/50a2b4b40713142e3e9bf24a922d64775a8ea97f))
* **pagamenti:** autorizzazione e cattura separate per gli ordini online ([2512c6d](https://github.com/innovagodev/iGOdelivering/commit/2512c6d34f2d0cd49098570019995d2489a80529))
* **pagamenti:** conferma via webhook, scadenza, pannello e rimborsi (fasi 5-7) ([9665092](https://github.com/innovagodev/iGOdelivering/commit/9665092b9024235aca577ccdb7f8c00002545ac2))


### Bug Fixes

* **stripe:** pagamento online offerto appena l'account Stripe e' attivo ([326da1f](https://github.com/innovagodev/iGOdelivering/commit/326da1f5a4ba7331286ea7c244638635f955c8df))

## [1.32.0](https://github.com/innovagodev/iGOdelivering/compare/v1.31.0...v1.32.0) (2026-10-06)


### Features

* **pagamenti:** collegamento Stripe reale nel pannello e stato nel wizard (fase 3) ([eda44ea](https://github.com/innovagodev/iGOdelivering/commit/eda44eab7d91492e7cedb85ad650ab060c90cf60))

## [1.31.0](https://github.com/innovagodev/iGOdelivering/compare/v1.30.5...v1.31.0) (2026-10-06)


### Features

* **db:** base dei pagamenti online, migration 028 (Stripe Connect, fase 1) ([cc87e47](https://github.com/innovagodev/iGOdelivering/commit/cc87e47fb17f4b1ddc194b28990151e31513730d))
* **stripe:** collegamento dei ristoranti a Stripe Connect e webhook (fase 2) ([269d2ff](https://github.com/innovagodev/iGOdelivering/commit/269d2ff238fd343dda60f3fefa27efb91e0a8124))


### Bug Fixes

* **db:** il trigger di guardia su restaurants restituisce 42501 (migration 029) ([2eb6f0b](https://github.com/innovagodev/iGOdelivering/commit/2eb6f0b496001230c387fa75131890d438281a76))

### [1.30.5](https://github.com/innovagodev/iGOdelivering/compare/v1.30.4...v1.30.5) (2026-10-02)


### Bug Fixes

* **vetrina:** rimossi il modulo carta e le opzioni di pagamento online non reali ([6fad1d2](https://github.com/innovagodev/iGOdelivering/commit/6fad1d2146ee65c59bbf45f8cedaeda4c6c879da))

### [1.30.4](https://github.com/innovagodev/iGOdelivering/compare/v1.30.3...v1.30.4) (2026-10-02)


### Bug Fixes

* **auth:** il middleware legge il ruolo dal database, non da un cookie del browser ([49d362d](https://github.com/innovagodev/iGOdelivering/commit/49d362da16a8eb4dac397c5bb90ae7bee8d136e0))

### [1.30.3](https://github.com/innovagodev/iGOdelivering/compare/v1.30.2...v1.30.3) (2026-10-02)


### Bug Fixes

* **db:** la 026 ricrea restaurants_public invece di sostituirla ([0ec653d](https://github.com/innovagodev/iGOdelivering/commit/0ec653dc9821b46d3b50618fd74bb06f998cc0bf))
* **vetrina:** lettura dei ristoranti dalla vista pubblica restaurants_public ([6f4574a](https://github.com/innovagodev/iGOdelivering/commit/6f4574ade09f82c5fec33ea86bb8f3fb756bcd35))

### [1.30.2](https://github.com/innovagodev/iGOdelivering/compare/v1.30.1...v1.30.2) (2026-10-02)


### Bug Fixes

* **auth:** token di attivazione in una tabella accessibile solo dal server ([58dcbc9](https://github.com/innovagodev/iGOdelivering/commit/58dcbc9c24be6c7ad61d44699d84be46ca50dbe9))
* **db:** rimossa la policy profiles self insert (N17) ([3840917](https://github.com/innovagodev/iGOdelivering/commit/38409171d87806e2598fbf280807f9e31436260f))

### [1.30.1](https://github.com/innovagodev/iGOdelivering/compare/v1.30.0...v1.30.1) (2026-10-02)


### Bug Fixes

* **ordini:** orari, sospensioni e ferie verificati anche da /api/orders ([eb97f01](https://github.com/innovagodev/iGOdelivering/commit/eb97f017431febd4a1de748953d0f95f90c89d57))

## [1.30.0](https://github.com/innovagodev/iGOdelivering/compare/v1.29.3...v1.30.0) (2026-10-01)


### Features

* **api:** rate limit su /api/orders e /api/bookings, contatore in Postgres ([97d73cf](https://github.com/innovagodev/iGOdelivering/commit/97d73cfa4223e2d22914a58711577ee6659cb3d0))
* **auth:** attivazione ristoratore con token monouso a scadenza ([819190d](https://github.com/innovagodev/iGOdelivering/commit/819190d30c7f08d1882cc8d2e7ad5fb6696213a3))
* **prenotazioni:** capienza in coperti per fascia, controllo atomico nel database ([dd3d035](https://github.com/innovagodev/iGOdelivering/commit/dd3d035b56f73fecb096a3a9b8a0519347d4258e))


### Bug Fixes

* **api:** send-status-email richiede sessione ristoratore o admin ([57a6a62](https://github.com/innovagodev/iGOdelivering/commit/57a6a622191070d2de085d6993725d358ed6c3b3))
* **checkout:** le opzioni dei piatti si validano sugli option_groups, non su un listino generico ([bcc0d69](https://github.com/innovagodev/iGOdelivering/commit/bcc0d693296f4d73697d6b936778ef2bb0a6cf02))
* **checkout:** ordini e prenotazioni creati lato server con importi ricalcolati ([58fd6f4](https://github.com/innovagodev/iGOdelivering/commit/58fd6f43f2eb8a336f50b1336f33e43fe900f892))
* **db:** l'unicita' del token di attivazione e' un indice parziale, non un vincolo ([9c5dca7](https://github.com/innovagodev/iGOdelivering/commit/9c5dca771c6e5e3febfe4e162a7ede9c99d02b6e))
* **ordini,promo:** scadenza e consumo promo via RPC, non piu' UPDATE anonimi ([c6e9802](https://github.com/innovagodev/iGOdelivering/commit/c6e980254435f610697ec58793a2ed190b19dea1))
* **prenotazioni:** numero d'ordine dalla sequenza del database ([fe1c8b9](https://github.com/innovagodev/iGOdelivering/commit/fe1c8b97ce92c4b51db0ce897a4322988287d39d))
* **promo:** la verifica first_order passa da una RPC e nega in caso di errore ([27878c3](https://github.com/innovagodev/iGOdelivering/commit/27878c36444f88f99dbd2cd43ee8b8350a68f5c7))
* **tracking:** la pagina ordine legge da route server-side e cerca per UUID ([1921861](https://github.com/innovagodev/iGOdelivering/commit/1921861a35cc8644d418dfc898aeb1a2ffbc7e47))
* **vetrina:** "I miei ordini" legge gli ordini del dispositivo, non cerca per email ([59152ac](https://github.com/innovagodev/iGOdelivering/commit/59152ac84b7d1a021117694d8a80c24b29ffc139))
* **vetrina:** rimossa la disattivazione della consegna alle 12:15 ([d29d701](https://github.com/innovagodev/iGOdelivering/commit/d29d701a2e25e054687020df746f9fb6d17ef279))

### [1.29.3](https://github.com/innovagodev/iGOdelivering/compare/v1.29.2...v1.29.3) (2026-09-22)


### Bug Fixes

* ripristino vetrina e checkout pubblici, storage per tenant ([ff609ac](https://github.com/innovagodev/iGOdelivering/commit/ff609ac55bfcca197f5d0d2f682e7af9b64071e6))

### [1.29.2](https://github.com/innovagodev/iGOdelivering/compare/v1.29.1...v1.29.2) (2026-09-10)


### Bug Fixes

* banner image, campo input percentuale coupon e funzionamento coupon ([8c34fb5](https://github.com/innovagodev/iGOdelivering/commit/8c34fb59aa593c093d367ed3656d41e87e68ebdc))

### [1.29.1](https://github.com/innovagodev/iGOdelivering/compare/v1.29.0...v1.29.1) (2026-09-04)


### Bug Fixes

* update metadati ([fa40784](https://github.com/innovagodev/iGOdelivering/commit/fa407846071c1aa74e6ab35f936c794160eedeb6))

## [1.29.0](https://github.com/innovagodev/iGOdelivering/compare/v1.28.6...v1.29.0) (2026-09-04)


### Features

* aggiunto gestione cap zone di consegna e fetch del cap reale ([3993027](https://github.com/innovagodev/iGOdelivering/commit/39930277057818059b5ac4ca7ba6c2b784529a12))

### [1.28.6](https://github.com/innovagodev/iGOdelivering/compare/v1.28.5...v1.28.6) (2026-09-04)


### Bug Fixes

* fetch orari consegna/asporto e delivery zone ([71b12a1](https://github.com/innovagodev/iGOdelivering/commit/71b12a10a3ace14860960560ffde007451492fc9))

### [1.28.5](https://github.com/innovagodev/iGOdelivering/compare/v1.28.4...v1.28.5) (2026-09-04)


### Bug Fixes

* responsive banner e topbar ([98c8c88](https://github.com/innovagodev/iGOdelivering/commit/98c8c8873b73a86bf9043be661b4871e7e1258d8))

### [1.28.4](https://github.com/innovagodev/iGOdelivering/compare/v1.28.3...v1.28.4) (2026-09-04)


### Bug Fixes

* ottimizzata topbar navigazione e hero section dinamica ([30182d5](https://github.com/innovagodev/iGOdelivering/commit/30182d57a1b5dafc3a15e205858ed8681dfb0112))

### [1.28.3](https://github.com/innovagodev/iGOdelivering/compare/v1.28.2...v1.28.3) (2026-09-04)


### Bug Fixes

* ottimizzata topbar navigazione e hero section ([be3343b](https://github.com/innovagodev/iGOdelivering/commit/be3343b3b5269c6ff3cf814fc8b14be223c3203c))

### [1.28.2](https://github.com/innovagodev/iGOdelivering/compare/v1.28.1...v1.28.2) (2026-09-04)


### Bug Fixes

* aggiornato sfondo top bar navigazione con pulsanti più evidenti e meno trasparenza ([765a7b4](https://github.com/innovagodev/iGOdelivering/commit/765a7b4d55506cda0f82db9101b24768b76c8085))

### [1.28.1](https://github.com/innovagodev/iGOdelivering/compare/v1.28.0...v1.28.1) (2026-09-04)


### Bug Fixes

* **menu:** ottimizzazione orari, nav categorie mobile e topbar 2 righe ([5b823fc](https://github.com/innovagodev/iGOdelivering/commit/5b823fc963b9ec716187604717047686cb6439f2))

## [1.28.0](https://github.com/innovagodev/iGOdelivering/compare/v1.27.1...v1.28.0) (2026-08-06)


### Features

* **menu:** add dish reordering, category grouping, bottom add button, and customer menu category sections ([2a891e2](https://github.com/innovagodev/iGOdelivering/commit/2a891e28ba9c353a3081254097ab77817010407c))
* **menu:** allineamento completo su Supabase, rimozione localStorage, fix orari differenziati, ordinamento filtri e tracking link ([bf80860](https://github.com/innovagodev/iGOdelivering/commit/bf8086005142bfbc37ea8d549b7c23d59ba14b3b))


### Bug Fixes

* risolto errore id null su upsert categorie, piatti e promozioni in configurazione ristorante ([4779eef](https://github.com/innovagodev/iGOdelivering/commit/4779eef4cb4b702d965b58f3a6ba22b382a4edee))

### [1.27.2](https://github.com/innovagodev/iGOdelivering/compare/v1.27.1...v1.27.2) (2026-08-04)

### Bug Fixes

* risolto errore id null su upsert categorie, piatti e promozioni in configurazione ristorante ([4779eef](https://github.com/innovagodev/iGOdelivering/commit/4779eef))

### Features

* **menu:** allineamento completo su Supabase, rimozione localStorage, fix orari differenziati, ordinamento filtri e tracking link ([bf80860](https://github.com/innovagodev/iGOdelivering/commit/bf8086005142bfbc37ea8d549b7c23d59ba14b3b))

### [1.27.1](https://github.com/innovagodev/iGOdelivering/compare/v1.27.0...v1.27.1) (2026-07-08)


### Bug Fixes

* **database:** ottimizzazione delle operazioni di scrittura/lettura per la scalabilita del SaaS. Riscritto il salvataggio dei piatti del menu con la logica di upsert selettivo per evitare blocchi e perdite di dati storici. Ottimizzate le query degli ordini e delle prenotazioni inserendo un filtro temporale scorrevole per ridurre il carico di memoria e prevenire rallentamenti all'aumentare dei volumi. ([c8c6857](https://github.com/innovagodev/iGOdelivering/commit/c8c6857f5a4a3af93d5f00c1d2aeb19504037c07))

## [1.27.0](https://github.com/innovagodev/iGOdelivering/compare/v1.26.6...v1.27.0) (2026-07-03)


### Features

* gestione ordini persi e programmati, amministrazione ristoratori e notifiche email bilingue ([27d5af7](https://github.com/innovagodev/iGOdelivering/commit/27d5af75e836ca253215811a025297a7d9dbd879))

### [1.26.6](https://github.com/innovagodev/iGOdelivering/compare/v1.26.5...v1.26.6) (2026-07-01)

### [1.26.5](https://github.com/innovagodev/iGOdelivering/compare/v1.26.4...v1.26.5) (2026-06-30)


### Bug Fixes

* **audio:** aggiunto workaround autoplay browser per sbloccare l'AudioContext su qualsiasi pagina (es. dashboard) al primo click/tasto premuto dell'utente ([3bf2300](https://github.com/innovagodev/iGOdelivering/commit/3bf2300edbe67d6b896a88a3827b85958e70a11a))

### [1.26.4](https://github.com/innovagodev/iGOdelivering/compare/v1.26.3...v1.26.4) (2026-06-30)


### Bug Fixes

* **audio:** riproduzione istantanea a latenza zero del suono di notifica all'arrivo dell'evento Supabase Realtime, senza attendere il completamento della query asincrona di allineamento ([18284ba](https://github.com/innovagodev/iGOdelivering/commit/18284ba59b1707eff054f5f4dd5cf8c30d4bbdc8))

### [1.26.3](https://github.com/innovagodev/iGOdelivering/compare/v1.26.2...v1.26.3) (2026-06-30)


### Bug Fixes

* **tracker:** risolto bug definitivo - il popup cliente non si aggiornava all'accettazione. Aggiunto window event dispatcher sincrono nella subscription del page per bypassare i problemi di remounting React di OrderStatusTracker. ([f4c39f9](https://github.com/innovagodev/iGOdelivering/commit/f4c39f9e963afae799332cb517a24c436e8b0871))

### [1.26.2](https://github.com/innovagodev/iGOdelivering/compare/v1.26.1...v1.26.2) (2026-06-30)


### Bug Fixes

* **tracker:** corretto bug critico - countdown non si fermava all'accettazione ordine. Aggiunto phaseRef e timerRef per cancellazione imperativa del timer senza attendere il ciclo React. ([1a29bde](https://github.com/innovagodev/iGOdelivering/commit/1a29bdedb46f517568776210e5119f61ee939b31))

### [1.26.1](https://github.com/innovagodev/iGOdelivering/compare/v1.26.0...v1.26.1) (2026-06-29)


### Bug Fixes

* **notification:** sistemato suono di notifica per ordini non accettati e aggiornamento realtime popup attesa ([01d5b40](https://github.com/innovagodev/iGOdelivering/commit/01d5b40ab0af399350b1e690f428848b7f33b906))

## [1.26.0](https://github.com/innovagodev/iGOdelivering/compare/v1.25.0...v1.26.0) (2026-06-25)


### Features

* **ristoratore:** implement real-time sound notifications and sidebar badge sync ([21303fc](https://github.com/innovagodev/iGOdelivering/commit/21303fc7fac62d618d5e0ed05228c4c1b8a108ff))

## [1.25.0](https://github.com/innovagodev/iGOdelivering/compare/v1.24.3...v1.25.0) (2026-06-22)


### Features

* associa metodi di pagamento per tipologia di servizio (consegna, asporto, tavolo) e seleziona ristorante da menu a tendina nel modale utenti ([c2bc612](https://github.com/innovagodev/iGOdelivering/commit/c2bc61202a484c0e26bba52de70462645211d147))


### Bug Fixes

* ordinamento categorie e traduzione giorni settimana nel checkout inglese ([ff1b0e5](https://github.com/innovagodev/iGOdelivering/commit/ff1b0e52807dcc8becef1ddcf9f8964d9113c944))

### [1.24.3](https://github.com/innovagodev/iGOdelivering/compare/v1.24.2...v1.24.3) (2026-06-22)


### Bug Fixes

* allineamento pannello ristoratore con corretta gestione loading ed empty state ([421ed01](https://github.com/innovagodev/iGOdelivering/commit/421ed01968c8e84a66b6f908ab39e683e182eaf8))

### [1.24.2](https://github.com/innovagodev/iGOdelivering/compare/v1.24.1...v1.24.2) (2026-06-22)

### [1.24.1](https://github.com/innovagodev/iGOdelivering/compare/v1.24.0...v1.24.1) (2026-06-19)


### Bug Fixes

* risoluzione bug pre-lancio, link attivazione e popolamento dinamico categorie ([9bd60d3](https://github.com/innovagodev/iGOdelivering/commit/9bd60d3e72d2a584495f5d41786f2bb1f75b9e36))

## [1.24.0](https://github.com/innovagodev/iGOdelivering/compare/v1.23.0...v1.24.0) (2026-06-17)


### Features

* aggiornamenti pagina accessi ([dac6ea7](https://github.com/innovagodev/iGOdelivering/commit/dac6ea703c9650bbefc91ea483eebdf0d15fa4b1))

## [1.23.0](https://github.com/innovagodev/iGOdelivering/compare/v1.22.0...v1.23.0) (2026-06-17)


### Features

* **menu:** implementata traduzione inglese per gruppi opzioni, allergeni e tag ([fe71a14](https://github.com/innovagodev/iGOdelivering/commit/fe71a14cd06539d6a6bf441967ae360f2fb5ace4))

## [1.22.0](https://github.com/innovagodev/iGOdelivering/compare/v1.21.0...v1.22.0) (2026-06-12)


### Features

* **i18n:** supporto bilingue IT/EN, rimozione codici hardcoded e toggle lingue minimal ([acae419](https://github.com/innovagodev/iGOdelivering/commit/acae41998d6f4c153fa7b882febc8e3e6fc355c8))

## [1.21.0](https://github.com/innovagodev/iGOdelivering/compare/v1.20.0...v1.21.0) (2026-06-11)


### Features

* redirect root homepage to WordPress landing page ([aae6e83](https://github.com/innovagodev/iGOdelivering/commit/aae6e8304e40c30ca9b47229d0c7cd59bf971678))

## [1.20.0](https://github.com/innovagodev/iGOdelivering/compare/v1.19.0...v1.20.0) (2026-06-11)


### Features

* corretto fetching supabase per ordini, pulizia residui dati mock ([235a547](https://github.com/innovagodev/iGOdelivering/commit/235a54781c352544ab898facd3e4aacd2c9a0a6c))

## [1.19.0](https://github.com/innovagodev/iGOdelivering/compare/v1.18.0...v1.19.0) (2026-06-11)


### Features

* **kanban,checkout:** ottimizzazione pannello live, gestione scaduti e allineamento interfaccia ([924c145](https://github.com/innovagodev/iGOdelivering/commit/924c145e567d44840a1eca5a2555498bf8b0c99d))

## [1.18.0](https://github.com/innovagodev/iGOdelivering/compare/v1.16.0...v1.18.0) (2026-06-10)


### Features

* implementato database clienti (CRM) per ristoratori con filtri temporali avanzati ([5ee5fd8](https://github.com/innovagodev/iGOdelivering/commit/5ee5fd889e981ca2a8bd09ccf6ffc86eb07229ae))

## [1.16.0](https://github.com/innovagodev/iGOdelivering/compare/v1.15.0...v1.16.0) (2026-06-09)


### Features

* integrazione database Supabase, limitazioni personalizzazione piatti e ottimizzazione UX mobile ([65d0189](https://github.com/innovagodev/iGOdelivering/commit/65d0189d223a6b9da05c2910d3536761d3672b63))

## [1.15.0](https://github.com/innovagodev/iGOdelivering/compare/v1.14.0...v1.15.0) (2026-06-04)


### Features

* **payment:** integrazione flussi pagamenti online stripe e paypal oauth connect e selettore dinamico vetrina client ([439f059](https://github.com/innovagodev/iGOdelivering/commit/439f059ea951731c821f98edba8f9371d527709b))

## [1.14.0](https://github.com/innovagodev/iGOdelivering/compare/v1.13.0...v1.14.0) (2026-06-03)


### Features

* implementazione pre-ordini a locale chiuso, raggruppamento accordion varianti e audit responsivo completo ([db91324](https://github.com/innovagodev/iGOdelivering/commit/db91324dbe61ed6c4e2d4126a93db86a177c2cc5))

## [1.13.0](https://github.com/innovagodev/iGOdelivering/compare/v1.12.0...v1.13.0) (2026-05-30)


### Features

* **saas:** implementa ID giornalieri semantici, bridge prenotazioni live, tag piatti unificati, timer dinamici in cucina e sidebar dettagli comanda ([f552a11](https://github.com/innovagodev/iGOdelivering/commit/f552a11d3653064b131dbcdfbc07d1dc1f34b864))

## [1.12.0](https://github.com/innovagodev/iGOdelivering/compare/v1.13.0...v1.12.0) (2026-05-28)


### Features

* **beta:** creazione manuale account, animazione fly-to-cart e notifiche live ([2d787fb](https://github.com/innovagodev/iGOdelivering/commit/2d787fbf8446aca26306b2bfe9fb5b33be5704b7))

## [1.13.0](https://github.com/innovagodev/iGOdelivering/compare/v1.11.2...v1.13.0) (2026-05-27)


### Features

* persistenza azioni amministratore, ottimizzazione controlli promozioni e incremento versione a 1.12.0 ([7b1e433](https://github.com/innovagodev/iGOdelivering/commit/7b1e4334d828e808f6c4607719eb40cd37156cdc))

### [1.11.2](https://github.com/innovagodev/iGOdelivering/compare/v1.11.1...v1.11.2) (2026-05-26)


### Bug Fixes

* risolto bug di mismatch di idratazione (hydration mismatch) nella vetrina cliente gestendo il rendering condizionale con isMounted ([4ddb4d2](https://github.com/innovagodev/iGOdelivering/commit/4ddb4d2ded429d562c50434919316ebd17cbfe9c))

### [1.11.1](https://github.com/innovagodev/iGOdelivering/compare/v1.11.0...v1.11.1) (2026-05-26)


### Bug Fixes

* risolti bug di comunicazione, unificazione tipi impostazioni ristorante, sincronizzazione vetrina-menu, persistenza ordini live e kanban, dashboard con KPI dinamici e integrazione prenotazioni tavolo ([d3c487f](https://github.com/innovagodev/iGOdelivering/commit/d3c487f00e6a39e54f781de401186f6eef7b981d))

## [1.11.0](https://github.com/innovagodev/iGOdelivering/compare/v1.10.0...v1.11.0) (2026-05-25)


### Features

* **checkout:** implementa validazioni di business e configurazione conto di accredito IBAN ([bcc2030](https://github.com/innovagodev/iGOdelivering/commit/bcc2030ab66c6ff55749cb6989aacdc761d15fbe))

## [1.10.0](https://github.com/innovagodev/iGOdelivering/compare/v1.9.1...v1.10.0) (2026-05-25)


### Features

* **tavoli:** implement tables management, local logo uploader, and minimal print layout ([ace16e1](https://github.com/innovagodev/iGOdelivering/commit/ace16e1b2149d57fda4a06c925fa67bd33d13292))

### [1.9.1](https://github.com/innovagodev/iGOdelivering/compare/v1.9.0...v1.9.1) (2026-05-22)


### Bug Fixes

* ottimizzato layout orari admin wizard allargando contenitore ed eliminando icone sun/moon ([ae8e5b4](https://github.com/innovagodev/iGOdelivering/commit/ae8e5b412de89504ffec293bbbb244a7d7f0038f))

## [1.9.0](https://github.com/innovagodev/iGOdelivering/compare/v1.8.2...v1.9.0) (2026-05-22)


### Features

* uniformata la gestione degli orari di apertura tra admin e ristoratore con layout responsive mobile-first ([9872d35](https://github.com/innovagodev/iGOdelivering/commit/9872d351db21482b87ac7edeaaab178f2efc7d52))

### [1.8.2](https://github.com/innovagodev/iGOdelivering/compare/v1.8.1...v1.8.2) (2026-05-22)


### Bug Fixes

* risolto blocco dello scroll su carrello, checkout e foglio di personalizzazione piatto ([819f2ee](https://github.com/innovagodev/iGOdelivering/commit/819f2ee78d272e2a158fa450f8b728cab73e737b))

### [1.8.1](https://github.com/innovagodev/iGOdelivering/compare/v1.8.0...v1.8.1) (2026-05-22)

## [1.8.0](https://github.com/innovagodev/iGOdelivering/compare/v1.7.0...v1.8.0) (2026-05-22)


### Features

* **menu:** risoluzione doppio chevron, rimozione visibilita avanzata e nuova gestione allergeni in localStorage ([930ca97](https://github.com/innovagodev/iGOdelivering/commit/930ca9789baeb8778e7c012ef54f325acef4a806))

## [1.7.0](https://github.com/innovagodev/iGOdelivering/compare/v1.6.0...v1.7.0) (2026-05-22)


### Features

* implementazione promozioni con prezzo scontato e listino barrato, rimozione badge popolari/veg/spicy e azzeramento minimo d'ordine ([94f1bef](https://github.com/innovagodev/iGOdelivering/commit/94f1beffdf263945d3e888e15817e14bc09536f7))

## [1.6.0](https://github.com/innovagodev/iGOdelivering/compare/v1.5.0...v1.6.0) (2026-05-22)


### Features

* unificazione topbar, rimozione tab orari e ottimizzazioni ([e27e5ed](https://github.com/innovagodev/iGOdelivering/commit/e27e5edca8a86051b5816718b7aed2f7e4c584c0))

## [1.5.0](https://github.com/innovagodev/iGOdelivering/compare/v1.4.0...v1.5.0) (2026-05-20)


### Features

* **checkout:** ottimizzazione UX mobile-first del checkout, prevenzione auto-zoom campi input iOS, rimozione subtotale e riepilogo piatti Step 1, design minimale coupon e allungamento orari test ([80fd026](https://github.com/innovagodev/iGOdelivering/commit/80fd026624c4498f61b870c313a5a5f845b06531))

## [1.4.0](https://github.com/innovagodev/iGOdelivering/compare/v1.3.0...v1.4.0) (2026-05-19)


### Features

* **storefront:** redesign carrello a pannello singolo con svuota carrello e tasto torna pillola ([228d61c](https://github.com/innovagodev/iGOdelivering/commit/228d61c60d71b8b7d4c35f5bf955c067f7e4a267))

## [1.3.0](https://github.com/innovagodev/iGOdelivering/compare/v1.2.2...v1.3.0) (2026-05-19)


### Features

* **app:** restyling completo UX/UI vetrina, separazione admin/login e smooth scrolling ([2216cae](https://github.com/innovagodev/iGOdelivering/commit/2216cae50a893ef01f1ff99a979d4ca4ac5d5e0e))

### [1.2.2](https://github.com/innovagodev/iGOdelivering/compare/v1.2.1...v1.2.2) (2026-05-19)

### [1.2.1](https://github.com/innovagodev/iGOdelivering/compare/v1.2.0...v1.2.1) (2026-05-19)

## 1.2.0 (2026-05-18)


### Features

* **refactor:** completate fondamenta di modularità, autenticazione, pannelli e allineamento WCAG 2.1 ([26b8a40](https://github.com/innovagodev/iGOdelivering/commit/26b8a408f92f480956cf2222c4789e25f4328a46))

## 1.1.0 (2026-05-18)


### Features

* **refactor:** completate fondamenta di modularità, autenticazione, pannelli e allineamento WCAG 2.1 ([319cc01](https://github.com/innovagodev/iGOdelivering/commit/319cc016cb56dbaddc5d7da82acbf6cf74c98313))
