<?php

declare(strict_types=1);

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,OPTIONS', 'Content-Type');

require_once __DIR__ . '/_lib/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Metodo nao permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'ID invalido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT nome, mime_type, conteudo FROM midia_arquivo WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'Arquivo nao encontrado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $mime = (string) ($row['mime_type'] ?? 'application/octet-stream');
    $content = $row['conteudo'];
    if (is_resource($content)) {
        $content = stream_get_contents($content);
    }
    if (!is_string($content) || $content === '') {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'Conteudo indisponivel.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=86400');
    header('Content-Length: ' . (string) strlen($content));
    if (!empty($row['nome'])) {
        header('Content-Disposition: inline; filename="' . str_replace('"', '', (string) $row['nome']) . '"');
    }
    echo $content;
    exit;
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => 'Erro ao carregar midia.', 'detail' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}
