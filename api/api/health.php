<?php

declare(strict_types=1);

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,OPTIONS', 'Content-Type');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

try {
    db()->query('SELECT 1');
    json_response([
        'ok' => true,
        'db' => true,
        'message' => 'MySQL conectado.',
    ]);
} catch (Throwable $e) {
    json_response([
        'ok' => false,
        'db' => false,
        'message' => 'Falha ao conectar ao MySQL. Verifique DB_HOST, DB_NAME, DB_USER, DB_PASS e DB_SSL no projeto PHP (Vercel).',
        'detail' => $e->getMessage(),
    ], 500);
}
