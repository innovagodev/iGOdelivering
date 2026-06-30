# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
