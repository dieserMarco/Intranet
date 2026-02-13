<?php

declare(strict_types=1);

return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'austriax_web_id_ff_intranet',
        'username' => 'root',
        'password' => '123',
        'charset' => 'utf8mb4',
    ],
    'token' => [
        'default_prefix' => 'FFWN',
        'segment_length' => 4,
        'segment_count' => 2,
        'ttl_minutes' => 60,
    ],
];
