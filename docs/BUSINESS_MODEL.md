# 💼 Modello di Business & Strategia — iGOdelivering

## 🧭 Visione del Progetto
iGOdelivering è una **piattaforma B2B2C** ispirata al modello di **GloriaFood**. L'obiettivo non è essere un aggregatore (come JustEat o Deliveroo), ma fornire ai ristoratori gli strumenti tecnologici per gestire la propria identità digitale e i propri ordini in modo indipendente.

---

## 🏪 Modello degli URL (Direct-to-Consumer)
A differenza delle directory centralizzate, iGOdelivering utilizza un'architettura basata su URL dedicati. Questo permette a ogni ristorante di avere una propria identità e di condividere il proprio link direttamente sui social o tramite QR code.

### Struttura degli URL:
- `igodelivering.it/` → Landing page istituzionale (Acquisizione Ristoratori).
- `igodelivering.it/login` → Portale di accesso/registrazione per Ristoratori.
- `igodelivering.it/admin` → Portale di amministrazione globale (Superadmin).
- `igodelivering.it/menu/[slug]` → **Vetrina pubblica dinamica** (es. `/menu/pizzeria-bella-napoli`).

---

## 👥 Tipologie di Utente

### 1. 🏢 Superadmin (innovaGO)
- **Ruolo:** Proprietario della piattaforma.
- **Responsabilità:** Gestione dei partner (ristoranti), monitoraggio globale, configurazione tecnica.
- **Accesso:** `/admin`.

### 2. 🍕 Ristoratore (Partner)
- **Ruolo:** Merchant.
- **Responsabilità:** Configurazione menu, gestione zone di consegna, monitoraggio ordini live, gestione prenotazioni.
- **Accesso:** `/login` con redirect a `/ristoratore/dashboard`.

### 3. 🛒 Cliente Finale (Consumer)
- **Ruolo:** Ospite (Guest).
- **Responsabilità:** Ordinazione tramite link/QR code.
- **Accesso:** Nessun account richiesto. Atterra direttamente sulla rotta `/menu/[slug]`.

---

## 🛒 Esperienza Cliente & "Guest Checkout"
Per massimizzare le conversioni e ridurre l'attrito (friction), il cliente non deve registrarsi.

### Flusso di Ordinazione:
1. **Atterraggio:** Il cliente scansiona un QR o clicca un link.
2. **Selezione:** Naviga il menu e aggiunge prodotti al carrello.
3. **Checkout:** Inserisce i dati minimi necessari (Nome, Telefono, Indirizzo per consegna).
4. **Persistenza:** Al momento del checkout, il cliente può scegliere "Ricordami su questo dispositivo".
   - I dati vengono salvati nel `localStorage` del browser.
   - Agli ordini successivi, i campi saranno pre-compilati.

### Dati salvati (localStorage):
```json
{
  "igodelivering_customer": {
    "name": "Nome Cliente",
    "phone": "+39 ...",
    "email": "...",
    "defaultAddress": "Via ...",
    "lastUpdated": "ISO_DATE"
  }
}
```

---

## 🔮 Evoluzione Futura
Sebbene il modello attuale privilegi la velocità dell'ordine come ospite, il sistema è predisposto per:
- **Account Cliente Opzionale:** Per permettere lo storico ordini su più dispositivi.
- **Ordini al Tavolo Localizzati:** Utilizzo di parametri query (es. `?tavolo=5`) per identificare la posizione esatta del cliente nel locale.

---
*Documento Strategico — Proprietà di Innovago*
