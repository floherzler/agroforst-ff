# Bestellungen anlegen (Mitgliedschaft × Angebot)

> Cloud Function (Node, Appwrite) zum Platzieren einer Bestellung.  
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
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TABLE_OFFERS_ID`
- `APPWRITE_TABLE_ORDERS_ID`
- `APPWRITE_TABLE_MEMBERSHIPS_ID`
- `APPWRITE_TABLE_PRODUCTS_ID`
- `APPWRITE_TABLE_BACKOFFICE_EVENTS_ID`

---

## 📥 Eingaben

Die Funktion akzeptiert JSON **und** Query-Parameter:

- `offer_id` *(String, Pflicht)* – ID des Angebots
- `membership_id` *(String, optional)* – ID der Mitgliedschaft des Nutzers
- `quantity` *(Number, Pflicht, > 0)* – angefragte Menge

> **User-ID** kommt aus dem Header `x-appwrite-user-id` (kein Body-Feld nötig).  
> Optional kannst du später ein `idempotencyKey` ergänzen (siehe „Idempotenz“).

**Beispiel (JSON):**
```json
{ "offer_id": "offer_123", "membership_id": "membership_123", "quantity": 250 }
