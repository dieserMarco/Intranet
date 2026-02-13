<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

function db(array $dbConfig): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'],
        $dbConfig['database'],
        $dbConfig['charset']
    );

    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function randomTokenPart(int $length): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $alphabetLength = strlen($alphabet);
    $tokenPart = '';

    for ($i = 0; $i < $length; $i++) {
        $tokenPart .= $alphabet[random_int(0, $alphabetLength - 1)];
    }

    return $tokenPart;
}

function buildFormattedToken(string $prefix, int $segmentLength, int $segmentCount): string
{
    $cleanPrefix = strtoupper(trim($prefix));
    $segments = [];

    for ($i = 0; $i < $segmentCount; $i++) {
        $segments[] = randomTokenPart($segmentLength);
    }

    return $cleanPrefix . '-' . implode('-', $segments);
}

function createToken(PDO $pdo, string $prefix, int $segmentLength, int $segmentCount, int $ttlMinutes): array
{
    $token = buildFormattedToken($prefix, $segmentLength, $segmentCount);

    $createdAt = new DateTimeImmutable('now');
    $expiresAt = $createdAt->modify(sprintf('+%d minutes', $ttlMinutes));

    $statement = $pdo->prepare(
        'INSERT INTO tokens (token, prefix, created_at, expires_at) VALUES (:token, :prefix, :created_at, :expires_at)'
    );

    $statement->execute([
        ':token' => $token,
        ':prefix' => strtoupper(trim($prefix)),
        ':created_at' => $createdAt->format('Y-m-d H:i:s'),
        ':expires_at' => $expiresAt->format('Y-m-d H:i:s'),
    ]);

    return [
        'token' => $token,
        'created_at' => $createdAt,
        'expires_at' => $expiresAt,
    ];
}

$flash = ['ok' => null, 'error' => null];
$generated = null;

try {
    $pdo = db($config['db']);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $prefix = (string) ($_POST['prefix'] ?? $config['token']['default_prefix']);
        $segmentLength = (int) $config['token']['segment_length'];
        $segmentCount = (int) $config['token']['segment_count'];
        $ttlMinutes = (int) $config['token']['ttl_minutes'];

        $generated = createToken($pdo, $prefix, $segmentLength, $segmentCount, $ttlMinutes);
        $flash['ok'] = 'Token wurde in die Tabelle tokens gespeichert.';
    }
} catch (Throwable $exception) {
    $flash['error'] = 'Datenbankfehler: ' . $exception->getMessage();
}
?>
<!doctype html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Token-Generator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="token-generator">
<main class="container">
    <section class="panel">
        <h1>Token-Generator (PHP + MySQL)</h1>
        <p class="muted">Format: <strong>FFWN-6ERL-JSQ7</strong> · Gültigkeit: 60 Minuten · Speicherung in Tabelle <code>tokens</code>.</p>

        <?php if ($flash['ok'] !== null): ?>
            <div class="notice notice--ok"><?= htmlspecialchars($flash['ok'], ENT_QUOTES) ?></div>
        <?php endif; ?>

        <?php if ($flash['error'] !== null): ?>
            <div class="notice notice--error"><?= htmlspecialchars($flash['error'], ENT_QUOTES) ?></div>
        <?php endif; ?>

        <div class="grid grid--single">
            <form method="post" class="card">
                <h2>Token generieren</h2>

                <label>Prefix
                    <input name="prefix" value="<?= htmlspecialchars($config['token']['default_prefix'], ENT_QUOTES) ?>" required>
                </label>

                <p class="muted small">Automatisches Format: PREFIX-XXXX-XXXX (nur Großbuchstaben/Zahlen, ohne 0/O/1/I).</p>

                <button type="submit">Neuen Token erstellen</button>
            </form>
        </div>

        <?php if ($generated !== null): ?>
            <section class="result">
                <h3>Neuer Token</h3>
                <p><strong><?= htmlspecialchars($generated['token'], ENT_QUOTES) ?></strong></p>
                <p>Erstellt: <?= $generated['created_at']->format('d.m.Y H:i:s') ?></p>
                <p>Gültig bis: <?= $generated['expires_at']->format('d.m.Y H:i:s') ?></p>
            </section>
        <?php endif; ?>
    </section>
</main>
</body>
</html>
