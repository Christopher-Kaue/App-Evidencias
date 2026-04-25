<?php

require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Role, X-User-Id');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

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

    $tmpName = (string)($file['tmp_name'] ?? '');
    $originalName = (string)($file['name'] ?? '');
    $size = (int)($file['size'] ?? 0);
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

    $baseDir = realpath(__DIR__ . '/..');
    if ($baseDir === false) {
        json_response(['message' => 'Diretorio base invalido.'], 500);
    }
    $uploadDir = $baseDir . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
        json_response(['message' => 'Nao foi possivel criar diretorio de upload.'], 500);
    }

    $safeBaseName = preg_replace('/[^a-zA-Z0-9_-]/', '-', pathinfo($originalName, PATHINFO_FILENAME));
    $safeBaseName = trim((string)$safeBaseName, '-');
    if ($safeBaseName === '') {
        $safeBaseName = 'arquivo';
    }
    $fileName = $safeBaseName . '-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $extension;
    $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;

    if (!move_uploaded_file($tmpName, $targetPath)) {
        json_response(['message' => 'Nao foi possivel salvar o arquivo.'], 500);
    }

    $base = getenv('PUBLIC_APP_URL');
    if ($base === false || trim((string) $base) === '') {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base = $scheme . '://' . $host;
    }
    $base = rtrim((string) $base, '/');
    $url = $base . '/uploads/' . $fileName;
    json_response(['message' => 'Upload realizado com sucesso.', 'data' => ['url' => $url]], 201);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
