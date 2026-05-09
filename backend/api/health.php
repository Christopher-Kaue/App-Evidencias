<?php

declare(strict_types=1);

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,OPTIONS', 'Content-Type');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/schema_check.php';
require_once __DIR__ . '/_lib/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

try {
    $pdo = db();
    $pdo->query('SELECT 1');

    $missing = schema_missing_tables($pdo);
    if ($missing !== []) {
        json_response([
            'ok' => false,
            'db' => true,
            'schema_ready' => false,
            'code' => 'schema_missing',
            'missing_tables' => $missing,
            'message' => 'PostgreSQL ligado, mas as tabelas do app nao existem. Execute database/schema_postgres.sql no mesmo servidor (SQL Editor da Neon, psql ou npm run docker:schema com Docker local).',
        ], 503);
    }

    json_response([
        'ok' => true,
        'db' => true,
        'schema_ready' => true,
        'message' => 'PostgreSQL conectado e schema presente.',
    ]);
} catch (Throwable $e) {
    $hint = getenv('DATABASE_URL') !== false && trim((string) getenv('DATABASE_URL')) !== ''
        ? ' Confira DATABASE_URL ou DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT e DB_SSL.'
        : ' Verifique DATABASE_URL (recomendado na Vercel) ou DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT e DB_SSL.';
    json_response([
        'ok' => false,
        'db' => false,
        'schema_ready' => false,
        'message' => 'Falha ao conectar ao PostgreSQL.' . $hint,
        'detail' => $e->getMessage(),
    ], 500);
}
