# Bestellungen anlegen (Mitgliedschaft × Angebot)

> Cloud Function (Deno, Appwrite) zum Platzieren einer Bestellung.  
> Verknüpft eine **aktive Mitgliedschaft** mit einem **Angebot**, prüft Verfügbarkeit, reserviert Menge und legt eine **Bestellung** als Snapshot an.

---

## 🚀 Aufruf & Authentifizierung

- Die Funktion wird idealerweise über den Appwrite SDK-Aufruf `functions.createExecution(...)` vom **eingeloggten Nutzer** ausgelöst.
- Der aufrufende Nutzer wird über den Header **`x-appwrite-user-id`** erkannt (vom Appwrite-Gateway gesetzt).
- Die Funktion nutzt den übergebenen **`x-appwrite-key`**-Header intern, um mit Datenbanken zu sprechen (siehe bestehendes Funktions-Template).

---

## 🔧 Environment Variablen

In der Funktions-Konfiguration setzen:

- `APPWRITE_FUNCTION_API_ENDPOINT`
- `APPWRITE_FUNCTION_PROJECT_ID`
- `DB_ID`
- `COLL_ANGEBOTE`
- `COLL_BESTELLUNG`
- `COLL_MITGLIEDSCHAFT`
- `COLL_PRODUKTE` *(optional, um Produktnamen aus `produktID` aufzulösen)*
- `COLL_NOTIFICATIONS` *(optional, „Postfach“ für Admin-Benachrichtigungen)*
- `ADMIN_EMAIL` *(optional)*

---

## 📥 Eingaben

Die Funktion akzeptiert JSON **und** Query-Parameter:

- `angebotID` *(String, Pflicht)* – ID des Angebots
- `mitgliedschaftID` *(String, Pflicht)* – ID der Mitgliedschaft des Nutzers
- `menge` *(Number, Pflicht, > 0)* – angefragte Menge

> **User-ID** kommt aus dem Header `x-appwrite-user-id` (kein Body-Feld nötig).  
> Optional kannst du später ein `idempotencyKey` ergänzen (siehe „Idempotenz“).

**Beispiel (JSON):**
```json
{ "angebotID": "ang_123", "mitgliedschaftID": "mb2025-007", "menge": 250 }
