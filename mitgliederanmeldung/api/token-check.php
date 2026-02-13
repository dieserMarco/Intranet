<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['ok' => false, 'error' => 'Nur POST erlaubt.'], 405);
}

$input = read_json();
$token = trim((string)($input['token'] ?? ''));
$orgId = trim((string)($input['orgId'] ?? ''));

if ($token === '' || $orgId === '') {
    json_response(['ok' => false, 'error' => 'Token oder Organisation fehlt.'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT active, used, expires_at FROM invite_tokens WHERE org_id = :org_id AND token = :token LIMIT 1');
$stmt->execute([
    ':org_id' => $orgId,
    ':token' => $token,
]);
$row = $stmt->fetch();

if (!$row) {
    json_response(['ok' => false, 'error' => '❌ Token existiert nicht.'], 404);
}
if ((int)$row['active'] !== 1) {
    json_response(['ok' => false, 'error' => '❌ Token ist deaktiviert.'], 409);
}
if ((int)$row['used'] === 1) {
    json_response(['ok' => false, 'error' => '❌ Token wurde bereits eingelöst.'], 409);
}
if (!empty($row['expires_at']) && strtotime((string)$row['expires_at']) < time()) {
    json_response(['ok' => false, 'error' => '❌ Token ist abgelaufen.'], 409);
}

json_response(['ok' => true, 'valid' => true]);
