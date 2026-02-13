# Mitgliederanmeldung – Hinweise

## Sicheres Testen ohne Hintertür
Ein **statischer Admin-Mastertoken** ist nicht empfehlenswert (Sicherheitsrisiko).
Stattdessen gibt es einen geschützten Test-Endpunkt:

- `POST api/admin-create-test-token.php`
- Auth über Header `X-Admin-Test-Key`
- Server-seitig muss `TEST_ADMIN_KEY` als Umgebungsvariable gesetzt sein.

Beispiel:

```bash
curl -X POST "https://<host>/mitgliederanmeldung/api/admin-create-test-token.php" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Test-Key: <dein-admin-key>" \
  -d '{"orgId":"ffwn","ttlHours":24,"createdBy":"qa"}'
```

Antwort enthält einen einmaligen Test-Token, der normal in `invite_tokens` landet und bei Registrierung als `used=1` markiert wird.

## Demo-UI fürs Durchtesten
Frontend kann mit `?demo=1` gestartet werden, dann erscheint ein Button **„Testdaten einfüllen“**.

Beispiel:

- `https://<host>/mitgliederanmeldung/index.html?demo=1`

Damit werden nur Formfelder gefüllt – der Token bleibt Pflicht und muss gültig sein.
