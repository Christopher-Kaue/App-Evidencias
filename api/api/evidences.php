<?php

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Role, X-User-Id');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query('
            SELECT ee.id, ee.idevento, te.nome AS tipo
            FROM eventoevidencia ee
            JOIN tipoevidencia te ON te.id = ee.idtipoevidencia
            ORDER BY ee.id DESC
        ');
        json_response(['data' => $stmt->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = read_json_body();
        if (empty($body['idevento']) || empty($body['idtipoevidencia'])) {
            json_response(['message' => 'Campos obrigatorios: idevento e idtipoevidencia.'], 422);
        }

        $stmt = $pdo->prepare('INSERT INTO eventoevidencia (idevento, idtipoevidencia) VALUES (:idevento, :idtipo)');
        $stmt->execute([
            ':idevento' => (int)$body['idevento'],
            ':idtipo' => (int)$body['idtipoevidencia'],
        ]);
        json_response(['message' => 'Evidencia vinculada com sucesso.'], 201);
    }

    json_response(['message' => 'Metodo nao permitido.'], 405);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
