# 🚀 iGOdelivering — Professional Food Delivery SaaS

iGOdelivering è una piattaforma **B2B2C** completa per la gestione di ordini, consegne e prenotazioni dedicata al settore della ristorazione. Progettata per scalabilità e prestazioni, offre un'esperienza fluida sia per il ristoratore che per il cliente finale.

---

## 📚 Documentazione
La documentazione interna del progetto (architettura, roadmap, audit di sicurezza) non è
pubblicata in questa repository. Lo schema del database è versionato in `supabase/migrations/`.

---

## 🛠️ Tecnologie Core
- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript.
- **Backend/Database:** Supabase (PostgreSQL).
- **Styling:** Vanilla CSS, Tailwind CSS.
- **Sicurezza:** Middleware-based Auth, Role-based Access Control (RBAC).

---

## 🏃 Guida Rapida

1. **Installazione:**
   ```bash
   npm install
   ```

2. **Configurazione:**
   Copia `.env.example` in `.env` e configura le API keys di Supabase.

3. **Sviluppo:**
   ```bash
   npm run dev
   ```
   L'app sarà disponibile su [http://localhost:4028](http://localhost:4028).

---

## 📦 Struttura Modulare
Il progetto è diviso in domini logici:
- **`superadmin/`**: Gestione globale della piattaforma.
- **`ristoratore/`**: Dashboard operativa per i partner.
- **`menu/`**: Vetrina pubblica per gli utenti finali.

---
© 2026 iGOdelivering — Progettato con eccellenza da Innovago.