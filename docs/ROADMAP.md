# 🚀 Manuale Operativo Beta — iGOdelivering
> Questo documento è il **manuale operativo** del progetto. Traccia ogni funzionalità da implementare prima del rilascio beta, divisa per area tematica, con priorità esplicite e stato di avanzamento.
> **Regola d'oro:** Ogni riga con `[ ]` è lavoro da fare. Ogni riga con `[x]` è completata e non va toccata.

---

## 🏁 Fondamenta Completate

### ✅ Fase 1 — Refactoring & Modularità
- [x] Wizard Nuovo Ristorante scomposto in 6 sotto-componenti (`src/components/admin/restaurant-wizard/`)
- [x] Gestione Menu Ristoratore modulare (`src/components/ristoratore/menu-management/`)
- [x] Pulizia rotte legacy: rimosso `/auth`, unificato su `/login`
- [x] Sidebar dinamica per ruolo (`admin` / `ristoratore`)

### ✅ Fase 2 — Sicurezza & Accessi
- [x] Middleware di autenticazione su `/ristoratore/*` e `/admin/*`
- [x] AuthContext globale con persistenza Cookie (compatibile middleware)
- [x] Login Ristoratore con logica primo accesso e cambio password obbligatorio
- [x] Login unificato su `/login` → redirect basato sul ruolo

---

---

# 🛒 BLOCCO A — Esperienza Pubblica Cliente (Consumer)
> Obiettivo: Creare un'esperienza d'acquisto fluida, veloce e senza frizioni per il cliente finale che arriva tramite link o QR Code.

---

## 🍱 A1 — Vetrina Cliente `/menu/[slug]` (IN CORSO)

### Completate
- [x] Rotta dinamica `/menu/[slug]` operativa con resolver di brand
- [x] Titolo tab del browser aggiornato dinamicamente per ogni ristorante
- [x] Header della vetrina con nome ristorante, valutazioni, orari e contatti
- [x] Griglia prodotti con card (foto, badge Popolare/Veg/Piccante, allergeni, prezzo)
- [x] Barra di ricerca prodotti in tempo reale
- [x] Navigazione per categorie con sticky scroll e highlight attivo
- [x] Carrello laterale desktop + drawer mobile
- [x] Modal Checkout con flusso a 3 step (Dettagli → Pagamento → Conferma)
- [x] Tracking ordine simulato (Confermato → In Preparazione → In Consegna → Consegnato)
- [x] Modal prenotazione tavolo (data, ora, ospiti, nome, telefono)

### Da Completare — PRIORITÀ ALTA
- [ ] **Guest Checkout con Persistenza `localStorage`**: Aggiungere checkbox "Ricordami su questo dispositivo" nel modal checkout. Al click, salvare `{ nome, telefono, indirizzo }` nel `localStorage` con chiave `iGO_guest_[slug]`. Al caricamento successivo pre-compilare automaticamente i campi.
- [ ] **Modalità Tavolo nel Checkout**: Aggiungere una terza opzione "Ordina al Tavolo" (oltre a Domicilio e Asporto) con campo per il numero del tavolo. Opzione attivabile/disattivabile dal pannello ristoratore.
- [ ] **Validazione Orari di Apertura**: Leggere gli orari di apertura del ristorante (in futuro da Supabase, ora da dati mock) e mostrare un banner "Siamo chiusi — prossima apertura alle 12:00" impedendo il checkout immediato ma permettendo ordini programmati.
- [ ] **Gestione Codice Promo Reale**: Il codice promo attivo (es. `BELLANAPOLI10`) deve essere configurabile dal pannello ristoratore. Attualmente è hardcoded nella vetrina.
- [ ] **Contatore Carrello Mobile**: Mostrare il numero di articoli nel carrello sull'icona del carrello fisso in basso su mobile (FAB floating button).

### Da Completare — PRIORITÀ MEDIA
- [ ] **Pagina Prodotto Espansa**: Al click su una card prodotto aprire un bottom-sheet/modal con foto grande, descrizione completa, lista allergeni completa, e varianti/modificatori (es. "senza cipolla", "piccante extra").
- [ ] **Sezione "Più Ordinati"**: Aggiungere una sezione hero orizzontale scrollabile in cima al menu con i prodotti `popular: true` in evidenza prima delle categorie.
- [ ] **Animazione Aggiunta al Carrello**: Micro-animazione "fly to cart" quando si aggiunge un prodotto (pallino che vola verso l'icona carrello).
- [ ] **Condivisione Vetrina**: Pulsante "Condividi" nell'header della vetrina che copia il link `igodelivering.it/menu/[slug]` negli appunti con feedback visivo.

---

## 🌐 A2 — Landing Page B2B Istituzionale `/` (COMPLETATA)
- [x] Header minimalista con solo logo e pulsante Accedi
- [x] Hero Section con CTA "Richiedi Informazioni" (scroll to `#contact`) e "Prova la Demo Cliente"
- [x] Griglia 6 funzionalità chiave con icone
- [x] Sezione contatti Innovago con email e telefono in evidenza (cliccabili)
- [x] Box demo live Pizzeria Bella Napoli
- [x] Footer ultra-minimal con copyright e link innovago.it
- [x] Favicon trasparente aggiornata con logo_admin2.png
- [x] Logo pulito e trasparente come default in AppLogo.tsx

---

## 📦 A3 — Ordini & Storico Cliente (DA INIZIARE)
> Opzionale per la beta, ma aumenta notevolmente la fidelizzazione.

- [ ] **Storico Ordini Guest**: Salvare gli ultimi 10 ordini effettuati nel `localStorage` con il loro stato simulato. Accessibili da un'icona "I miei ordini" nell'header della vetrina.
- [ ] **Ricevuta Ordine Digitale**: Al completamento del checkout mostrare un riepilogo stampa-friendly con numero ordine, prodotti, totale e stima consegna.
- [ ] **Notifica Browser (Push API)**: Chiedere il permesso per le notifiche e notificare il cliente quando l'ordine cambia stato (es. "🛵 Il tuo ordine è in consegna!").

---

---

# 🏢 BLOCCO B — Pannelli di Gestione CRM

---

## 🍕 B1 — Pannello Ristoratore (PARZIALMENTE COMPLETATO)

### Dashboard / Panoramica — Completata
- [x] KPI Bento Grid (Ordini oggi, Ricavi, Tempo medio, Rating)
- [x] Kanban ordini live (colonne: Nuovo → In Preparazione → In Consegna → Consegnato)
- [x] Grafico ricavi settimanali/mensili (RevenueChart dinamico)
- [x] Distribuzione ordini per tipo (Domicilio / Asporto / Tavolo)
- [x] Top prodotti del giorno per quantità e fatturato
- [x] Tabella storico ordini con filtri

### Dashboard / Panoramica — Da Completare
- [ ] **Data Dinamica nell'Header**: Sostituire la data hardcoded "Domenica 3 maggio 2026" con `new Date().toLocaleDateString('it-IT', { weekday: 'long', ... })`.
- [ ] **Nome Ristorante da Context**: Il nome "Pizzeria Bella Napoli" nell'header topbar deve venire dall'`AuthContext` e non essere hardcoded.
- [ ] **Badge Notifiche Reali**: Il badge `3` sulla voce "Ordini Live" nella sidebar e il campanello devono riflettere il numero reale di ordini in attesa nel Kanban.

### B1.2 — Gestione Menu `/ristoratore/menu` — Completata
- [x] Lista prodotti con categorie collassabili
- [x] Aggiunta, modifica, eliminazione di prodotti
- [x] Gestione immagine (URL), descrizione, prezzo, allergeni
- [x] Toggle disponibilità prodotto in tempo reale
- [x] Selezione categoria e ordinamento

### B1.3 — Zone di Consegna `/ristoratore/zone` — DA CREARE 🔴
> Sezione **critica**: senza di questa, il ristoratore non può definire dove consegna.
- [ ] **Pagina dedicata `/ristoratore/zone`** accessibile dal click sulla voce "Zone Consegna" nella sidebar (attualmente punta alla dashboard).
- [ ] **Lista Zone CAP**: Il ristoratore aggiunge CAP serviti con un campo input + pulsante aggiungi. Visualizzazione lista con badge colorati e pulsante rimozione.
- [ ] **Impostazioni per Zona**: Per ogni zona configurare: spesa minima d'ordine (€), costo spedizione (€), tempo stimato di consegna (min).
- [ ] **Raggio Chilometrico (alternativo ai CAP)**: Toggle per switchare tra modalità "CAP" e modalità "Raggio" (inserisce km massimi dalla sede).
- [ ] **Sede del Ristorante**: Campo per l'indirizzo completo del punto di ritiro/partenza delle consegne.
- [ ] **Persistenza Mock**: Salvataggio in `localStorage` con chiave `iGO_zones_[restaurantId]` in attesa di Supabase.

### B1.4 — Promozioni & Codici Sconto `/ristoratore/promozioni` — DA CREARE 🟡
- [ ] **Pagina dedicata `/ristoratore/promozioni`** accessibile dalla sidebar.
- [ ] **Creazione Codice Promo**: Form per creare codice (stringa testuale), tipo sconto (% o €), valore, data di scadenza, numero massimo utilizzi.
- [ ] **Lista Codici Attivi**: Tabella con codice, tipo, valore, utilizzi/max, scadenza, stato (Attivo/Scaduto) e pulsante disattiva.
- [ ] **Integrazione Vetrina**: Il codice promo creato qui deve essere quello controllato nel checkout della vetrina cliente.
- [ ] **Persistenza Mock**: Salvataggio in `localStorage` con chiave `iGO_promos_[restaurantId]`.

### B1.5 — Impostazioni Ristorante `/ristoratore/impostazioni` — DA CREARE 🟡
- [ ] **Pagina dedicata `/ristoratore/impostazioni`** accessibile dalla sidebar.
- [ ] **Sezione Profilo**: Modifica nome ristorante, indirizzo, telefono, email, categoria (Pizzeria, Trattoria, etc.).
- [ ] **Orari di Apertura**: Griglia settimanale (Lun–Dom) con toggle aperto/chiuso e input orario apertura/chiusura per fascia pranzo e cena.
- [ ] **Logo & Copertina**: Upload URL per logo del ristorante e immagine di copertina della vetrina (in futuro Supabase Storage).
- [ ] **Preferenze Ordini**: Toggle per abilitare/disabilitare Domicilio, Asporto e Ordine al Tavolo.
- [ ] **Link Vetrina & QR Code**: Mostrare il link diretto `igodelivering.it/menu/[slug]` con pulsante copia e visualizzazione del QR Code generato dal link.
- [ ] **Persistenza Mock**: Salvataggio in `localStorage` con chiave `iGO_settings_[restaurantId]`.

### B1.6 — Prenotazioni Tavoli `/ristoratore/prenotazioni` — DA CREARE 🟢
- [ ] **Pagina dedicata `/ristoratore/prenotazioni`** con voce nella sidebar.
- [ ] **Vista Calendario**: Visualizzazione prenotazioni in formato calendario (giornaliero/settimanale) con slot orari.
- [ ] **Lista Prenotazioni del Giorno**: Tabella con nome, n° ospiti, ora, telefono e stato (Confermata / In Attesa / Annullata).
- [ ] **Cambio Stato**: Il ristoratore può segnare una prenotazione come "Confermata" o "Annullata" direttamente dalla lista.

---

## 🏢 B2 — Pannello Admin (PARZIALMENTE COMPLETATO)

### B2.1 — Gestione Ristoranti `/admin/restaurants` — Quasi Completa
- [x] Tabella ristoranti con ricerca, filtri per stato (Pubblicato/Bozza/Sospeso)
- [x] Statistiche rapide: totale, pubblicati, bozze, sospesi
- [x] Azioni per ristorante: Configura, Gestisci Accessi, Sospendi/Riattiva, Elimina
- [x] Modal di conferma eliminazione con avviso
- [x] Caricamento ristoranti nuovi da `localStorage` (creati col wizard)
- [ ] **Link Vetrina dalla Tabella**: Aggiungere una colonna/link "Apri Vetrina" che porta a `/menu/[slug]` per ogni ristorante pubblicato.
- [ ] **Pagina Dettaglio Ristorante `/admin/restaurants/[id]`**: Schermata di riepilogo del singolo ristorante (tutti i dati, menu count, ordini totali, status).

### B2.2 — Wizard Nuovo Ristorante `/admin/restaurants/new` — Completo
- [x] Step 1: Info base (nome, indirizzo, categoria, telefono, email)
- [x] Step 2: Credenziali ristoratore (email login, password temporanea)
- [x] Step 3: Configurazione zone di consegna iniziali
- [x] Step 4: Orari di apertura
- [x] Step 5: Impostazioni ordini (domicilio/asporto/tavolo toggle)
- [x] Step 6: Riepilogo e conferma con salvataggio in `localStorage`

### B2.3 — Gestione Utenti `/admin/utenti` — DA CREARE 🟡
- [ ] **Pagina dedicata `/admin/utenti`** con voce sidebar (attualmente punta a restaurants).
- [ ] **Tabella Utenti**: Lista di tutti i ristoratori registrati con nome, email, ristorante associato, data creazione, stato account (Attivo/Sospeso).
- [ ] **Azioni**: Reset password, sospensione account, cambio email.
- [ ] **Crea Utente Manuale**: Form rapido per creare un nuovo ristoratore indipendentemente dal wizard (utile per ristoranti già esistenti).

### B2.4 — Dashboard Globale Piattaforma `/admin/dashboard` — DA CREARE 🟢
- [ ] **Pagina dedicata `/admin/dashboard`** come landing dell'admin (attualmente atterra su restaurants).
- [ ] **KPI Globali**: Totale ristoranti attivi, totale ordini della piattaforma oggi, fatturato aggregato, nuovi partner del mese.
- [ ] **Grafico Crescita Partner**: Andamento storico del numero di ristoranti attivi nel tempo.
- [ ] **Ultimi Ordini Globali**: Feed degli ultimi 10 ordini ricevuti su tutta la piattaforma.

### B2.5 — Impostazioni Piattaforma `/admin/impostazioni` — DA CREARE 🟢
- [ ] **Pagina dedicata `/admin/impostazioni`** con voce sidebar.
- [ ] **Parametri Globali**: Commissioni di default, valuta, lingua piattaforma.
- [ ] **Contatti di Supporto**: Email e telefono Innovago visualizzati ai ristoratori nell'area "Assistenza".
- [ ] **Testo dei Template Email**: Editor semplice per personalizzare i messaggi automatici (benvenuto, reset password).

### B2.6 — Log & Sicurezza `/admin/sicurezza` — DA CREARE 🟢
- [ ] **Pagina dedicata `/admin/sicurezza`** con voce sidebar.
- [ ] **Log degli Accessi**: Tabella con data/ora, utente, IP, azione (login, logout, modifica password) per tutti i ristoratori.
- [ ] **Sessioni Attive**: Visualizzazione e chiusura forzata delle sessioni aperte.

---

---

# ☁️ BLOCCO C — Integrazione Backend Reale (DOPO LA BETA MOCK)
> Queste attività sostituiranno i dati `localStorage` con Supabase reale. Non blocca il rilascio beta.

- [ ] **Schema DB Supabase**: Tabelle `restaurants`, `menu_categories`, `menu_items`, `orders`, `order_items`, `delivery_zones`, `promos`, `bookings`, `profiles`.
- [ ] **Row Level Security (RLS)**: Policy che permettono al ristoratore di leggere/scrivere solo i propri dati.
- [ ] **Supabase Auth**: Migrazione da cookie mock a Supabase Auth JWT. Mantenere compatibilità con il middleware Next.js.
- [ ] **Supabase Storage**: Bucket `restaurant-logos` e `menu-images` per upload reali da pannello.
- [ ] **Real-time Ordini**: Canale Supabase Realtime per aggiornare il Kanban del ristoratore senza refresh.
- [ ] **Edge Functions**: Logica server-side per invio email di conferma ordine al cliente e notifica al ristoratore.

---

# 📱 BLOCCO D — PWA & Performance (DOPO LA BETA)
- [ ] **Manifest PWA**: `manifest.json` con icone, colori brand, `display: standalone`.
- [ ] **Service Worker**: Cache-first per asset statici, network-first per dati API.
- [ ] **Installazione iOS & Android**: Test e fix meta tag per installazione su schermata home.
- [ ] **Lighthouse Audit**: Target score 90+ su Performance, Accessibilità e SEO.
- [ ] **Ottimizzazione Immagini**: Verifica che tutte le immagini usino `next/image` con `sizes` corretto.
- [ ] **i18n (Internazionalizzazione)**: Predisposizione `next-intl` per supporto EN/IT come base.

---

## 🗓️ Priorità di Esecuzione Raccomandata

| Priorità | Area | Task |
|---|---|---|
| 🔴 1 | A1 Consumer | Guest Checkout con persistenza `localStorage` |
| 🔴 2 | B1 Ristoratore | Zone di Consegna `/ristoratore/zone` |
| 🔴 3 | A1 Consumer | Modalità Tavolo + Validazione Orari |
| 🟡 4 | B1 Ristoratore | Impostazioni Ristorante `/ristoratore/impostazioni` |
| 🟡 5 | B1 Ristoratore | Promozioni & Codici Sconto `/ristoratore/promozioni` |
| 🟡 6 | B2 Admin | Gestione Utenti `/admin/utenti` |
| 🟡 7 | A1 Consumer | Pagina Prodotto Espansa + Sezione "Più Ordinati" |
| 🟢 8 | B1 Ristoratore | Prenotazioni Tavoli `/ristoratore/prenotazioni` |
| 🟢 9 | B2 Admin | Dashboard Globale `/admin/dashboard` |
| 🟢 10 | A3 Consumer | Storico Ordini Guest + Ricevuta Digitale |
| ⚪ 11+ | Blocco C | Integrazione Supabase reale |
| ⚪ 12+ | Blocco D | PWA & Performance Audit |

---

*Ultimo aggiornamento: 19 Maggio 2026 — Versione: Beta Roadmap v1.2.0*
