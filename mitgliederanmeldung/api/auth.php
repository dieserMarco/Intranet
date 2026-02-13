<?php
declare(strict_types=1);

function env_value(string $key, ?string $default = null): ?string {
    $value = getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }

    return $value;
}

function header_value(string $name): string {
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return trim((string)($_SERVER[$key] ?? ''));
}

function require_admin_test_key(): void {
    $expected = env_value('TEST_ADMIN_KEY');
    if ($expected === null) {
        json_response(['ok' => false, 'error' => 'TEST_ADMIN_KEY ist nicht gesetzt.'], 503);
    }

    $provided = header_value('X-Admin-Test-Key');
    if ($provided === '' || !hash_equals($expected, $provided)) {
        json_response(['ok' => false, 'error' => 'Nicht autorisiert.'], 401);
    }
}
