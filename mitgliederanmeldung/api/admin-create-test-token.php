<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['ok' => false, 'error' => 'Nur POST erlaubt.'], 405);
}

require_admin_test_key();

$input = read_json();
$orgId = trim((string)($input['orgId'] ?? 'ffwn'));
$ttlHours = max(1, min(168, (int)($input['ttlHours'] ?? 24)));
$createdBy = trim((string)($input['createdBy'] ?? 'admin-test'));

if ($orgId === '') {
    json_response(['ok' => false, 'error' => 'orgId fehlt.'], 400);
}

$token = 'TEST-' . strtoupper(bin2hex(random_bytes(2))) . '-' . strtoupper(bin2hex(random_bytes(2)));
$expiresAt = (new DateTimeImmutable('now'))->modify("+{$ttlHours} hours")->format('Y-m-d H:i:s');

$pdo = db();
$insert = $pdo->prepare('INSERT INTO invite_tokens (org_id, token, active, used, expires_at, created_by, token_type) VALUES (:org_id, :token, 1, 0, :expires_at, :created_by, :token_type)');
$insert->execute([
    ':org_id' => $orgId,
    ':token' => $token,
    ':expires_at' => $expiresAt,
    ':created_by' => $createdBy,
    ':token_type' => 'test',
]);

json_response([
    'ok' => true,
    'token' => $token,
    'expiresAt' => $expiresAt,
    'ttlHours' => $ttlHours,
]);
