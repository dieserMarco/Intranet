<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';

try {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput ?: '', true, 512, JSON_THROW_ON_ERROR);

    $token = strtoupper(trim((string) ($payload['token'] ?? '')));
    $prefix = strtoupper(trim((string) ($payload['prefix'] ?? $config['token']['default_prefix'])));

    if ($token === '' || $prefix === '') {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Token oder Prefix fehlt.']);
        exit;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['db']['host'],
        (int) $config['db']['port'],
        $config['db']['database'],
        $config['db']['charset']
    );

    $pdo = new PDO(
        $dsn,
        $config['db']['username'],
        $config['db']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $createdAt = new DateTimeImmutable('now');
    $expiresAt = $createdAt->modify(sprintf('+%d minutes', (int) $config['token']['ttl_minutes']));

    $statement = $pdo->prepare(
        'INSERT INTO tokens (token, prefix, created_at, expires_at, redeemed_at) VALUES (:token, :prefix, :created_at, :expires_at, :redeemed_at)'
    );

    $statement->execute([
        ':token' => $token,
        ':prefix' => $prefix,
        ':created_at' => $createdAt->format('Y-m-d H:i:s'),
        ':expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        ':redeemed_at' => null,
    ]);

    echo json_encode(['success' => true, 'message' => 'Token gespeichert.']);
} catch (JsonException $exception) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ungültige JSON-Daten.']);
} catch (PDOException $exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Datenbankfehler beim Speichern.']);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unbekannter Fehler beim Speichern.']);
}
