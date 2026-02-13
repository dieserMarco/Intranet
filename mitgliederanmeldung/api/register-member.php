<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_response(['ok' => false, 'error' => 'Nur POST erlaubt.'], 405);
}

$input = read_json();

$orgId = trim((string)($input['orgId'] ?? ''));
$token = trim((string)($input['invite_token'] ?? ''));
$vorname = trim((string)($input['vorname'] ?? ''));
$nachname = trim((string)($input['nachname'] ?? ''));
$geburtsdatum = trim((string)($input['geburtsdatum'] ?? ''));
$dmail = trim((string)($input['dmail'] ?? ''));
$citizenId = trim((string)($input['identifikationsnummer'] ?? ''));
$loginMail = trim((string)($input['login_mail'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($orgId === '' || $token === '' || $vorname === '' || $nachname === '' || $geburtsdatum === '' || $dmail === '' || $citizenId === '' || $loginMail === '' || $password === '') {
    json_response(['ok' => false, 'error' => 'Pflichtfelder fehlen.'], 400);
}

if (!filter_var($loginMail, FILTER_VALIDATE_EMAIL)) {
    json_response(['ok' => false, 'error' => '❌ Ungültige Login-E-Mail.'], 400);
}

if (strlen($password) < 8) {
    json_response(['ok' => false, 'error' => '❌ Passwort muss mindestens 8 Zeichen haben.'], 400);
}

$pdo = db();

try {
    $pdo->beginTransaction();

    $tokenStmt = $pdo->prepare('SELECT id, active, used FROM invite_tokens WHERE org_id = :org_id AND token = :token FOR UPDATE');
    $tokenStmt->execute([
        ':org_id' => $orgId,
        ':token' => $token,
    ]);
    $tokenRow = $tokenStmt->fetch();

    if (!$tokenRow) {
        throw new RuntimeException('❌ Token existiert nicht.');
    }
    if ((int)$tokenRow['active'] !== 1) {
        throw new RuntimeException('❌ Token ist deaktiviert.');
    }
    if ((int)$tokenRow['used'] === 1) {
        throw new RuntimeException('❌ Token wurde bereits eingelöst.');
    }

    $mailStmt = $pdo->prepare('SELECT id FROM members WHERE org_id = :org_id AND login_mail = :login_mail LIMIT 1');
    $mailStmt->execute([
        ':org_id' => $orgId,
        ':login_mail' => mb_strtolower($loginMail),
    ]);
    if ($mailStmt->fetch()) {
        throw new RuntimeException('❌ Diese Login-E-Mail existiert bereits.');
    }

    $counterStmt = $pdo->prepare('SELECT next_value FROM member_counters WHERE org_id = :org_id FOR UPDATE');
    $counterStmt->execute([':org_id' => $orgId]);
    $counterRow = $counterStmt->fetch();

    if (!$counterRow) {
        $nextValue = 1;
        $initStmt = $pdo->prepare('INSERT INTO member_counters (org_id, next_value) VALUES (:org_id, :next_value)');
        $initStmt->execute([':org_id' => $orgId, ':next_value' => 2]);
    } else {
        $nextValue = (int)$counterRow['next_value'];
        $updCounter = $pdo->prepare('UPDATE member_counters SET next_value = :next_value WHERE org_id = :org_id');
        $updCounter->execute([':next_value' => $nextValue + 1, ':org_id' => $orgId]);
    }

    $memberNumber = sprintf('21401-%03d', $nextValue);
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $defaults = $input['defaults'] ?? [];

    $insert = $pdo->prepare('INSERT INTO members (
        org_id, member_number, invite_token, anrede, titel, vorname, nachname, geburtsdatum,
        beruf, geburtsort, familienstand, staatsburgerschaft, identifikationsnummer, telefonnummer,
        forumsname, discord_id, adresse, postleitzahl, stadt, dmail, personalbild_url, login_mail,
        password_hash, mitglied_seit, aktueller_dienstgrad, letzte_beforderung, funktion, ausbildner,
        ausbildner_fur, dienstzuteilung, aktives_mitglied
    ) VALUES (
        :org_id, :member_number, :invite_token, :anrede, :titel, :vorname, :nachname, :geburtsdatum,
        :beruf, :geburtsort, :familienstand, :staatsburgerschaft, :identifikationsnummer, :telefonnummer,
        :forumsname, :discord_id, :adresse, :postleitzahl, :stadt, :dmail, :personalbild_url, :login_mail,
        :password_hash, :mitglied_seit, :aktueller_dienstgrad, :letzte_beforderung, :funktion, :ausbildner,
        :ausbildner_fur, :dienstzuteilung, :aktives_mitglied
    )');

    $today = (new DateTimeImmutable('now'))->format('d.m.Y');

    $insert->execute([
        ':org_id' => $orgId,
        ':member_number' => $memberNumber,
        ':invite_token' => $token,
        ':anrede' => $input['anrede'] ?? null,
        ':titel' => $input['titel'] ?? null,
        ':vorname' => $vorname,
        ':nachname' => $nachname,
        ':geburtsdatum' => $geburtsdatum,
        ':beruf' => $input['beruf'] ?? null,
        ':geburtsort' => $input['geburtsort'] ?? null,
        ':familienstand' => $input['familienstand'] ?? null,
        ':staatsburgerschaft' => $input['staatsburgerschaft'] ?? null,
        ':identifikationsnummer' => $citizenId,
        ':telefonnummer' => $input['telefonnummer'] ?? null,
        ':forumsname' => $input['forumsname'] ?? null,
        ':discord_id' => $input['discord_id'] ?? null,
        ':adresse' => $input['adresse'] ?? null,
        ':postleitzahl' => $input['postleitzahl'] ?? null,
        ':stadt' => $input['stadt'] ?? null,
        ':dmail' => $dmail,
        ':personalbild_url' => $input['personalbild_url'] ?? null,
        ':login_mail' => mb_strtolower($loginMail),
        ':password_hash' => $passwordHash,
        ':mitglied_seit' => $today,
        ':aktueller_dienstgrad' => $defaults['aktueller_dienstgrad'] ?? 'PFM',
        ':letzte_beforderung' => $today,
        ':funktion' => $defaults['funktion'] ?? 'Mannschaft',
        ':ausbildner' => $defaults['ausbildner'] ?? 'Nein',
        ':ausbildner_fur' => $defaults['ausbildner_fur'] ?? '---',
        ':dienstzuteilung' => $defaults['dienstzuteilung'] ?? 'Feuerwehr Wiener Neustadt',
        ':aktives_mitglied' => $defaults['aktives_mitglied'] ?? 'Ja',
    ]);

    $memberId = (int)$pdo->lastInsertId();

    $redeemStmt = $pdo->prepare('UPDATE invite_tokens SET used = 1, used_at = NOW(), used_by = :used_by WHERE id = :id');
    $redeemStmt->execute([
        ':used_by' => mb_strtolower($loginMail),
        ':id' => $tokenRow['id'],
    ]);

    $pdo->commit();

    json_response([
        'ok' => true,
        'memberNumber' => $memberNumber,
        'memberId' => $memberId,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    json_response(['ok' => false, 'error' => $e->getMessage()], 409);
}
