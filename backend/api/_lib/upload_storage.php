<?php

declare(strict_types=1);

function upload_public_base_url(): string
{
    $base = getenv('PUBLIC_APP_URL');
    if ($base !== false && trim((string) $base) !== '') {
        return rtrim(trim((string) $base), '/');
    }
    if (getenv('VERCEL') !== false && getenv('VERCEL') !== '') {
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return 'https://' . $host;
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    return $scheme . '://' . $host;
}

function upload_mime_from_extension(string $extension): string
{
    return match (strtolower($extension)) {
        'jpg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'mp4' => 'video/mp4',
        'mov' => 'video/quicktime',
        'avi' => 'video/x-msvideo',
        'mkv' => 'video/x-matroska',
        default => 'application/octet-stream',
    };
}

function upload_filesystem_dir(): string
{
    $baseDir = realpath(__DIR__ . '/../..');
    if ($baseDir === false) {
        return '';
    }

    return $baseDir . DIRECTORY_SEPARATOR . 'uploads';
}

function upload_can_use_filesystem(): bool
{
    if (getenv('VERCEL') !== false && getenv('VERCEL') !== '') {
        return false;
    }

    $dir = upload_filesystem_dir();
    if ($dir === '') {
        return false;
    }
    if (!is_dir($dir) && !@mkdir($dir, 0777, true) && !is_dir($dir)) {
        return false;
    }

    return is_writable($dir);
}

/**
 * @return array{url: string}
 */
function upload_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS midia_arquivo (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL DEFAULT \'application/octet-stream\',
            conteudo BYTEA NOT NULL,
            dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );
    $ready = true;
}

/**
 * @return array{url: string}
 */
function upload_store_file(PDO $pdo, string $fileName, string $extension, string $tmpPath): array
{
    $mime = upload_mime_from_extension($extension);

    if (upload_can_use_filesystem()) {
        $uploadDir = upload_filesystem_dir();
        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;
        if (!move_uploaded_file($tmpPath, $targetPath)) {
            throw new RuntimeException('Nao foi possivel salvar o arquivo.');
        }

        return ['url' => upload_public_base_url() . '/uploads/' . $fileName];
    }

    upload_ensure_schema($pdo);

    $binary = file_get_contents($tmpPath);
    if ($binary === false || $binary === '') {
        throw new RuntimeException('Nao foi possivel ler o arquivo enviado.');
    }

    $stmt = $pdo->prepare(
        'INSERT INTO midia_arquivo (nome, mime_type, conteudo) VALUES (:nome, :mime, :conteudo) RETURNING id'
    );
    $stmt->bindValue(':nome', $fileName);
    $stmt->bindValue(':mime', $mime);
    $stmt->bindValue(':conteudo', $binary, PDO::PARAM_LOB);
    $stmt->execute();
    $id = (int) $stmt->fetchColumn();

    $kind = str_starts_with($mime, 'video/') ? 'video' : 'image';

    return ['url' => upload_public_base_url() . '/api/media.php?id=' . $id . '&kind=' . $kind];
}
