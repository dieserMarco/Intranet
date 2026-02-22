<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        respond(400, ['error' => 'Ungültiger JSON-Body.']);
    }

    return $data;
}

function validateDate(string $date, string $field): string
{
    $dateTime = DateTime::createFromFormat('Y-m-d', $date);
    if (!$dateTime || $dateTime->format('Y-m-d') !== $date) {
        respond(422, ['error' => "Ungültiges Datum in Feld '{$field}'."]);
    }

    return $date;
}

function validatePayload(array $data): array
{
    $invoiceNo = trim((string)($data['invoice_no'] ?? ''));
    $type = (string)($data['type'] ?? '');
    $description = trim((string)($data['description'] ?? ''));
    $createdBy = trim((string)($data['created_by'] ?? ''));
    $amount = $data['amount'] ?? null;
    $date = (string)($data['date'] ?? '');

    if ($invoiceNo === '' || $description === '' || $createdBy === '' || $date === '') {
        respond(422, ['error' => 'Pflichtfelder fehlen.']);
    }

    if (!in_array($type, ['income', 'expense'], true)) {
        respond(422, ['error' => 'Ungültiger Typ.']);
    }

    if (!is_numeric($amount) || (float)$amount <= 0) {
        respond(422, ['error' => 'Ungültiger Betrag.']);
    }

    validateDate($date, 'date');

    return [
        'invoice_no' => mb_substr($invoiceNo, 0, 50),
        'type' => $type,
        'description' => mb_substr($description, 0, 255),
        'created_by' => mb_substr($createdBy, 0, 100),
        'amount' => number_format((float)$amount, 2, '.', ''),
        'date' => $date,
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = null;

try {
    $pdo = db();

    if ($method === 'GET') {
        $from = trim((string)($_GET['from'] ?? ''));
        $to = trim((string)($_GET['to'] ?? ''));
        $includeCancelled = (string)($_GET['include_cancelled'] ?? '1') === '1';

        $where = [];
        $params = [];

        if ($from !== '') {
            $where[] = 'date >= :from_date';
            $params['from_date'] = validateDate($from, 'from');
        }

        if ($to !== '') {
            $where[] = 'date <= :to_date';
            $params['to_date'] = validateDate($to, 'to');
        }

        if (!$includeCancelled) {
            $where[] = "status = 'active'";
        }

        $sql = 'SELECT id, invoice_no, type, description, amount, date, created_by, status, cancelled_at, cancelled_by, cancel_reason, created_at
                FROM transactions';

        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY date DESC, id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        respond(200, $stmt->fetchAll());
    }

    if ($method === 'POST') {
        $payload = validatePayload(readJsonBody());

        $stmt = $pdo->prepare(
            'INSERT INTO transactions (invoice_no, type, description, amount, date, created_by, status)
             VALUES (:invoice_no, :type, :description, :amount, :date, :created_by, "active")'
        );

        $stmt->execute($payload);

        respond(201, [
            'message' => 'Buchung erstellt.',
            'id' => (int)$pdo->lastInsertId(),
        ]);
    }

    if ($method === 'PUT') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id) {
            respond(400, ['error' => 'Ungültige oder fehlende ID.']);
        }

        $payload = validatePayload(readJsonBody());
        $payload['id'] = $id;

        $stmt = $pdo->prepare(
            'UPDATE transactions
             SET invoice_no = :invoice_no,
                 type = :type,
                 description = :description,
                 created_by = :created_by,
                 amount = :amount,
                 date = :date
             WHERE id = :id AND status = "active"'
        );

        $stmt->execute($payload);

        if ($stmt->rowCount() === 0) {
            respond(404, ['error' => 'Buchung nicht gefunden, storniert oder unverändert.']);
        }

        respond(200, ['message' => 'Buchung aktualisiert.']);
    }

    if ($method === 'PATCH') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $action = trim((string)($_GET['action'] ?? ''));

        if (!$id || $action !== 'cancel') {
            respond(400, ['error' => 'Für PATCH werden id und action=cancel benötigt.']);
        }

        $body = readJsonBody();
        $cancelledBy = trim((string)($body['cancelled_by'] ?? ''));
        $reason = trim((string)($body['cancel_reason'] ?? ''));

        if ($cancelledBy === '') {
            respond(422, ['error' => 'Für Storno wird cancelled_by benötigt.']);
        }

        $stmt = $pdo->prepare(
            'UPDATE transactions
             SET status = "cancelled",
                 cancelled_at = CURRENT_TIMESTAMP,
                 cancelled_by = :cancelled_by,
                 cancel_reason = :cancel_reason
             WHERE id = :id AND status = "active"'
        );

        $stmt->execute([
            'id' => $id,
            'cancelled_by' => mb_substr($cancelledBy, 0, 100),
            'cancel_reason' => mb_substr($reason, 0, 255),
        ]);

        if ($stmt->rowCount() === 0) {
            respond(404, ['error' => 'Buchung nicht gefunden oder bereits storniert.']);
        }

        respond(200, ['message' => 'Buchung wurde storniert.']);
    }

    if ($method === 'DELETE') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id) {
            respond(400, ['error' => 'Ungültige oder fehlende ID.']);
        }

        $stmt = $pdo->prepare('DELETE FROM transactions WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ['error' => 'Buchung nicht gefunden.']);
        }

        respond(200, ['message' => 'Buchung gelöscht.']);
    }

    respond(405, ['error' => 'Methode nicht erlaubt.']);
} catch (PDOException $exception) {
    respond(500, [
        'error' => 'Datenbankfehler.',
        'details' => $exception->getMessage(),
    ]);
}
