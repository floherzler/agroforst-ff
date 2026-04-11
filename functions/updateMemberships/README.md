# Überprüfe Mitgliedschaften

> Diese Funktion überprüft täglich alle Mitgliedschaften und sendet daraufhin Benachrichtigungen per E-Mail und deaktiviert abgelaufene Mitgliedschaften.

## Aktionen pro Mitgliedschaft
- `status` ist `warten` und `beantragungs_datum` war vor 7 Tagen
    - E-Mail mit Zahlungserinnerung
- `status` ist `aktiv` und `ende` ist in 14 Tagen
    - E-Mail mit Ablaufserinnerung
- `status` ist `aktiv` und `ende` ist heute
    - prüfe offenes Guthaben und dokumentierte Einlösungschance
    - wenn ausreichende Einlösungschance bis Laufzeitende bestand:
        - setze `status` auf `abgelaufen`
        - entferne User-Label `privatKunde`/ `businessKunde`
        - E-Mail mit Information über Ablauf und Verfall des Restguthabens
    - wenn keine zumutbare Einlösungschance bestand:
        - Mitgliedschaft nicht direkt endgültig verfallen lassen
        - befristete Verlängerung der Einlösefrist oder Ersatzguthaben-Prozess auslösen
        - E-Mail mit Hinweis auf Verlängerung bzw. Ersatzguthaben senden
- `status` ist `abgelaufen` -> nichts
