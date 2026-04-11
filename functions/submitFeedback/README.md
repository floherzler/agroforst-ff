# Feedback speichern

> Diese Funktion speichert Feedback in `kunden_nachrichten`.

**Die E-Mail muss verifiziert sein.**

## Funktion erhält
- `text`: freier Feedback-Text

## Verhalten
- prüft `x-appwrite-user-id`
- lädt den Nutzer aus Appwrite
- lehnt unbestätigte E-Mail-Adressen ab
- schreibt einen neuen Eintrag mit `nachrichtstyp = feedback`
- gibt den Eintrag nur für Admins frei
