<?php

declare(strict_types=1);

ini_set('display_errors', '0');

require_once __DIR__ . '/_lib/cors.php';
apply_cors('POST,OPTIONS', 'Content-Type, X-Role, X-User-Id');

require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';
require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/upload_storage.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

try {
    require_authenticated();

    if (!isset($_FILES['arquivo'])) {
        json_response(['message' => 'Arquivo obrigatorio.'], 422);
    }

    $file = $_FILES['arquivo'];
    if (!is_array($file)) {
        json_response(['message' => 'Arquivo invalido.'], 422);
    }

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_response(['message' => 'Falha no upload do arquivo.'], 422);
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    $originalName = (string) ($file['name'] ?? '');
    $size = (int) ($file['size'] ?? 0);
    if ($tmpName === '' || $originalName === '' || $size <= 0) {
        json_response(['message' => 'Arquivo invalido.'], 422);
    }

    $maxSizeBytes = 25 * 1024 * 1024;
    if ($size > $maxSizeBytes) {
        json_response(['message' => 'Arquivo excede o limite de 25MB.'], 422);
    }

    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'avi', 'mkv'];
    if (!in_array($extension, $allowed, true)) {
        json_response(['message' => 'Tipo de arquivo nao permitido. Use foto ou video.'], 422);
    }

    $safeBaseName = preg_replace('/[^a-zA-Z0-9_-]/', '-', pathinfo($originalName, PATHINFO_FILENAME));
    $safeBaseName = trim((string) $safeBaseName, '-');
    if ($safeBaseName === '') {
        $safeBaseName = 'arquivo';
    }
    $fileName = $safeBaseName . '-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $extension;

    $pdo = db();
    $stored = upload_store_file($pdo, $fileName, $extension, $tmpName);

    json_response(['message' => 'Upload realizado com sucesso.', 'data' => ['url' => $stored['url']]], 201);
} catch (Throwable $e) {
    $detail = $e->getMessage();
    if (str_contains($detail, 'midia_arquivo') || str_contains($detail, 'does not exist')) {
        json_response([
            'message' => 'Tabela de midias ausente no banco. Aplique database/migrations/001_midia_arquivo.sql no PostgreSQL.',
            'detail' => $detail,
            'code' => 'schema_missing',
        ], 500);
    }
    json_response(['message' => 'Erro interno.', 'detail' => $detail], 500);
}
