<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $stmt = db()->query('SELECT
            id, member_no, vorname, nachname, geburtsdatum, identifikationsnummer,
            forumsname, telefonnummer, discord_id, dmail, adresse, postleitzahl, stadt,
            login_mail, aktueller_dienstgrad, funktion, dienstzuteilung,
            aktives_mitglied, is_instructor, has_special_unit,
            DATE_FORMAT(created_at, "%d.%m.%Y") AS created_at,
            DATE_FORMAT(updated_at, "%d.%m.%Y") AS updated_at
            FROM members
            ORDER BY member_no ASC');

        json_response(['ok' => true, 'members' => $stmt->fetchAll()]);
    }

    if ($method === 'PUT') {
        $input = read_json_body();
        $id = (int)($input['id'] ?? 0);

        if ($id <= 0) {
            json_response(['ok' => false, 'error' => 'Ungültige Mitglied-ID.'], 400);
        }

        $stmt = db()->prepare('UPDATE members SET
            member_no = :member_no,
            vorname = :vorname,
            nachname = :nachname,
            geburtsdatum = :geburtsdatum,
            identifikationsnummer = :identifikationsnummer,
            forumsname = :forumsname,
            telefonnummer = :telefonnummer,
            discord_id = :discord_id,
            dmail = :dmail,
            adresse = :adresse,
            postleitzahl = :postleitzahl,
            stadt = :stadt,
            login_mail = :login_mail,
            aktueller_dienstgrad = :aktueller_dienstgrad,
            funktion = :funktion,
            dienstzuteilung = :dienstzuteilung,
            aktives_mitglied = :aktives_mitglied,
            is_instructor = :is_instructor,
            has_special_unit = :has_special_unit,
            updated_at = NOW()
            WHERE id = :id');

        $stmt->execute([
            ':id' => $id,
            ':member_no' => to_nullable_string($input['member_no'] ?? null),
            ':vorname' => to_nullable_string($input['vorname'] ?? null),
            ':nachname' => to_nullable_string($input['nachname'] ?? null),
            ':geburtsdatum' => to_nullable_string($input['geburtsdatum'] ?? null),
            ':identifikationsnummer' => to_nullable_string($input['identifikationsnummer'] ?? null),
            ':forumsname' => to_nullable_string($input['forumsname'] ?? null),
            ':telefonnummer' => to_nullable_string($input['telefonnummer'] ?? null),
            ':discord_id' => to_nullable_string($input['discord_id'] ?? null),
            ':dmail' => to_nullable_string($input['dmail'] ?? null),
            ':adresse' => to_nullable_string($input['adresse'] ?? null),
            ':postleitzahl' => to_nullable_string($input['postleitzahl'] ?? null),
            ':stadt' => to_nullable_string($input['stadt'] ?? null),
            ':login_mail' => to_nullable_string($input['login_mail'] ?? null),
            ':aktueller_dienstgrad' => to_nullable_string($input['aktueller_dienstgrad'] ?? null),
            ':funktion' => to_nullable_string($input['funktion'] ?? null),
            ':dienstzuteilung' => to_nullable_string($input['dienstzuteilung'] ?? null),
            ':aktives_mitglied' => to_int_bool($input['aktives_mitglied'] ?? 0),
            ':is_instructor' => to_int_bool($input['is_instructor'] ?? 0),
            ':has_special_unit' => to_int_bool($input['has_special_unit'] ?? 0),
        ]);

        json_response(['ok' => true]);
    }

    json_response(['ok' => false, 'error' => 'Methode nicht erlaubt.'], 405);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
