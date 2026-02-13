# Mitgliederanmeldung – Hinweise

## Dev-Token für Testzwecke
Wenn ihr lokal/sicher testen wollt, könnt ihr optional einen Dev-Token aktivieren:

- `ALLOW_DEV_TOKEN=1`
- `DEV_TOKEN=<dein-test-token>`

Dann akzeptieren `token-check.php` und `register-member.php` diesen Token direkt.
Der Dev-Token wird **nicht** als „used“ markiert und ist nur für Testumgebungen gedacht.

## Test-Token per Admin-API
Alternativ könnt ihr über API normale Test-Tokens anlegen:

- `POST api/admin-create-test-token.php`
- Header `X-Admin-Test-Key`
- Server-seitig `TEST_ADMIN_KEY` setzen

```bash
curl -X POST "https://<host>/mitgliederanmeldung/api/admin-create-test-token.php" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Test-Key: <dein-admin-key>" \
  -d '{"orgId":"ffwn","ttlHours":24,"createdBy":"qa"}'
```

## Demo-UI fürs Durchtesten
Frontend mit `?demo=1` starten, dann erscheint **„Testdaten einfüllen“**.

- `https://<host>/mitgliederanmeldung/index.html?demo=1`
