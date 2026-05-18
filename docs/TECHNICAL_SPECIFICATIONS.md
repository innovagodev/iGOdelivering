# 🏗️ Documentazione Tecnica — iGOdelivering

## 📜 Panoramica del Progetto
iGOdelivering è una piattaforma SaaS (B2B2C) progettata per digitalizzare l'attività dei ristoratori. La piattaforma permette ai proprietari di ristoranti di gestire menu, zone di consegna, ordini live e prenotazioni, fornendo al contempo una vetrina web professionale per i clienti finali.

---

## 🚀 Stack Tecnologico
- **Framework:** Next.js 14+ (App Router).
- **Linguaggio:** TypeScript.
- **Styling:** Vanilla CSS + Tailwind CSS (per utility specifiche).
- **Stato Globale:** React Context API (`AuthContext`).
- **Autenticazione:** Sistema Custom basato su JWT/Cookie + Supabase Auth (in fase di migrazione).
- **Automazione:** Script di auto-versioning e build timestamp (`scripts/update-version.js`).
- **Database:** Supabase (PostgreSQL).
- **Iconografia:** Lucide React.

---

## 📂 Struttura del Progetto (File Tree)
L'applicazione segue una struttura modulare per separare le logiche di business in base al ruolo dell'utente:

```
src/
├── app/
│   ├── (auth)/             # Rotte di autenticazione (/login, /admin)
│   ├── superadmin/         # Portale di amministrazione globale
│   ├── ristoratore/        # Dashboard e gestione per il partner
│   ├── menu/[slug]/        # Vetrina dinamica per il cliente finale
│   └── layout.tsx          # Wrapper globale (Providers)
├── components/
│   ├── ui/                 # Componenti atomici (Button, Toggle, Badge)
│   ├── superadmin/         # Componenti specifici per il superadmin
│   └── ristoratore/        # Componenti specifici per il ristoratore
├── context/                # Context Provider (Auth, Theme, etc.)
├── middleware.ts           # Logica di protezione rotte e redirect
└── lib/                    # Utility e configurazioni (Supabase, Fetcher)
```

---

## 🔐 Sistema di Autenticazione & Sicurezza

### Modello Multi-Ruolo
Il sistema riconosce due tipologie di utenti amministrativi:
1.  **Superadmin:** Gestisce la creazione dei ristoranti, i pagamenti e la manutenzione della piattaforma.
2.  **Ristoratore:** Gestisce la propria attività, menu e ordini.

### Protezione tramite Middleware
La sicurezza è gestita a livello server tramite `middleware.ts`. Il middleware controlla i cookie di sessione (`igodelivering_role`) e reindirizza gli utenti non autorizzati:
- Accesso a `/superadmin/*` → Richiede ruolo `superadmin`.
- Accesso a `/ristoratore/*` → Richiede ruolo `ristoratore`.
- Se non autenticato → Redirect a `/admin` o `/login`.

### Primo Accesso (First Login)
Per garantire la sicurezza dei nuovi ristoranti creati dal Superadmin:
- Viene generata una password temporanea.
- Il campo `isFirstLogin` è impostato a `true`.
- Al primo login, il sistema forza il reindirizzamento alla schermata di cambio password.

---

## 🛠️ Moduli Principali

### 1. Wizard Creazione Ristorante (Superadmin)
Situato in `src/components/superadmin/restaurant-wizard/`, è un processo in 6 fasi:
1.  **Info:** Dati anagrafici e configurazione prenotazione tavoli.
2.  **Delivery:** Definizione delle zone di consegna con raggio e costi.
3.  **Hours:** Configurazione orari di apertura generali e per servizio.
4.  **Scheduled:** Gestione preavviso ordini programmati.
5.  **Menu:** Definizione piatti, categorie e opzioni.
6.  **Review:** Riepilogo e generazione credenziali.

### 2. Gestione Menu (Ristoratore)
Situato in `src/components/ristoratore/menu-management/`, permette:
- Editing real-time dei piatti.
- Sospensione temporanea di singoli prodotti o intere categorie.
- Configurazione avanzata della visibilità (es. piatti visibili solo a pranzo).

---

## 🍱 Vetrina Cliente (Consumer)
La vetrina cliente è ottimizzata per la velocità e l'esperienza mobile (PWA). Utilizza rotte dinamiche `[slug]` basate sul nome unico del ristorante per caricare i dati via SSR (Server Side Rendering) per massimizzare l'SEO.

---

## 📊 Modello Dati (Entità Principali)
*(In fase di implementazione su Supabase)*
- **Profiles:** Dati utente e ruoli.
- **Restaurants:** Dati del locale, coordinate, slug unico.
- **Menu_Categories:** Gruppi di piatti.
- **Menu_Items:** Dettagli piatto (prezzo, allergeni, immagini).
- **Orders:** Storico e live feed ordini (con stato: ricevuto, in preparazione, consegnato).

---

*Documento ad uso interno — Proprietà di Innovago*
