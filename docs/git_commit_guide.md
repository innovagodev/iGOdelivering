# 📚 Guida Operativa al Commit & Rilascio di iGOdelivering

Questa guida passo-passo ti mostra come:
1. **Configurare un account Git specifico per questo progetto** (senza alterare le impostazioni globali del tuo computer).
2. **Aggiornare la versione dell'applicazione e auto-generare la data di build**.
3. **Aggiornare la documentazione interna (Roadmap)**.
4. **Effettuare un commit semantico corretto in lingua italiana**.
5. **Configurare chiavi SSH o credenziali GitHub multiple** se gestisci più account sul tuo sistema.

---

## 🔑 Fase 1 — Configurare un account Git locale per questo progetto
Se sul tuo PC usi un account GitHub personale o aziendale diverso e vuoi evitare di mescolare le identità (ed evitare che i commit compaiano col nome o l'email sbagliata), puoi forzare Git ad usare credenziali specifiche **solo per questa cartella**.

Apri il terminale all'interno della cartella principale del progetto `iGOdelivering` ed esegui i seguenti comandi:

```powershell
# 1. Imposta il nome autore per questo repository
git config --local user.name "Il Tuo Nome Github"

# 2. Imposta l'email associata all'account Github del progetto
git config --local user.email "la_tua_email_github@example.com"
```

### Come verificare che le modifiche siano attive:
Per essere sicuro che Git stia usando le credenziali corrette locali e non quelle globali, esegui:
```powershell
git config --local --list
```
Dovresti vedere le righe `user.name` e `user.email` con i valori appena impostati.

---

## 📈 Fase 2 — Aggiornare Versione e Data di Build
Il progetto ha un meccanismo automatizzato che legge la versione da `package.json` e compila dinamicamente un file `src/version.json` con la data e l'ora esatta di build.

### 1. Modifica la versione in `package.json`
Apri il file [package.json](file:///c:/Users/info/Documents/Adriano/Innovago/iGOdelivering/package.json) e individua la riga 3. Bassa la versione attuale o aumentala (ad esempio da `"1.0.0"` a `"1.1.0"` o `"1.0.1"` a seconda dell'entità delle modifiche):

```json
{
  "name": "igodelivering",
  "version": "1.0.1",   <-- Modifica questo valore
  ...
}
```

### 2. Auto-genera il file `src/version.json`
Esegui questo script dal terminale. Leggerà il nuovo valore e creerà/aggiornerà la data e ora esatte di build:

```powershell
npm run update-version
```

*Verifica visiva: Apri `src/version.json` per assicurarti che contenga la nuova versione e la data e ora correnti.*

---

## 📝 Fase 3 — Aggiornare la Documentazione (`ROADMAP.md`)
Prima di fare il commit, aggiorna la Roadmap per riflettere le migliorie dell'interfaccia introdotte per l'accessibilità e prevenire i fastidiosi zoom mobile.

Apri [ROADMAP.md](file:///c:/Users/info/Documents/Adriano/Innovago/iGOdelivering/docs/ROADMAP.md) e modifica la data di ultimo aggiornamento e versione alla fine del documento (riga 228):

```markdown
*Ultimo aggiornamento: 18 Maggio 2026 — Versione: Beta Roadmap v1.0.1*
```

---

## 💾 Fase 4 — Controllo, Staging e Commit
Adesso che i file di configurazione e documentazione sono pronti, prepariamo il commit.

### 1. Verifica lo stato dei file modificati
```powershell
git status
```
Dovresti vedere la lista dei file aggiornati (tra cui `src/app/menu/[slug]/page.tsx`, `src/app/superadmin/restaurants/[id]/configure/page.tsx`, `package.json`, `src/version.json`, ecc.).

### 2. Aggiungi tutti i file all'area di staging
```powershell
git add .
```

### 3. Fai il Commit Semantico in Italiano
Usa un messaggio descrittivo strutturato secondo le best practice di sviluppo (usando il prefisso `style` o `refactor` per i cambi di stile WCAG ed input zoom):

```powershell
git commit -m "style(a11y): uniformati i campi input a text-base per conformità WCAG 2.1 ed eliminazione zoom Safari mobile"
```

Se vuoi aggiungere maggiori dettagli nel corpo del commit, puoi fare:
```powershell
git commit -m "style(a11y): uniformati campi input e orari" -m "- Convertiti tutti gli input a text-base per eliminare l'auto-zoom forzato di Safari su iOS.
- Applicati attributi min-w-0, appearance-none e larghezze controllate sui selettori nativi di data/ora per prevenire sbordamenti responsive.
- Aggiornata la versione e la data di build nel sistema."
```

---

## 🚀 Fase 5 — Gestione di account GitHub Multipli al Push (Opzionale)
Se hai più account GitHub sul computer e ricevi un errore di autorizzazione (`Permission denied (publickey)` o credenziali errate) quando provi a fare `git push`, puoi risolvere in due modi:

### Opzione A: Usare una chiave SSH dedicata per questo repository
Se usi SSH, puoi dire a Git di usare una specifica chiave SSH privata solo per questo repository modificando il comando SSH di questo git localmente:

```powershell
git config --local core.sshCommand "ssh -i ~/.ssh/id_chiave_per_questo_progetto -F /dev/null"
```
*(Sostituisci `id_chiave_per_questo_progetto` con il nome del file della tua chiave privata configurata su GitHub per questo specifico account).*

### Opzione B: Modificare l'URL del remote per includere l'username corretto
Se usi HTTPS, puoi forzare Git a chiederti le credenziali dell'account specifico includendo il nome utente GitHub direttamente nell'URL del remote:

```powershell
# 1. Guarda l'attuale remote
git remote -v

# 2. Aggiornalo includendo l'username (es. mario_rossi)
git remote set-url origin https://mario_rossi@github.com/tuo-username-o-organizzazione/iGOdelivering.git
```

Una volta impostato il remote o la chiave corretta, invia le modifiche su GitHub:
```powershell
git push origin main
```
