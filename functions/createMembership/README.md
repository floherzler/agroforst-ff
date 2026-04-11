# Erstellen der Datenbank-Ressourcen für eine Mitgliedschaft

> Diese Funktion erstellt einen neuen Eintrag in der Appwrite-Collection `mitgliedschaften` und sendet eine Benachrichtigung per E-Mail.

**Die E-Mail muss verifiziert sein!**

## Funktion erhält:
- `user_id`: für wen wird die Mitgliedschaft beantragt (wer ruft die Funktion auf)?
- `typ`: `privat` oder `business`
- `dauer`: in Jahren, default ist 1 Jahr
- `agb_version`: akzeptierte AGB-Version, Pflicht
- `agb_accepted_at`: Zeitstempel der Zustimmung, Pflicht

## Aktionen:
### Datenbank (`mitgliedschaft`-Collection)
- `beantragungs_datum`: auf den aktuellen Zeitstempel
- `status`: auf `beantragt`
- `bezahl_status`: auf `beantragt` gesetzt
- `kontingent_start`: auf `preis`
- `agb_version`: aus Request übernehmen
- `agb_accepted_at`: aus Request übernehmen

### E-Mail
- Benachrichtigung über Eingang des Antrags einer Migliedschaft
- PDF einer generierten Rechnung
- Zahlungsaufruf für innerhalb einer Woche
