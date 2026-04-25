<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('POST,OPTIONS', 'Content-Type');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

try {
    $body = read_json_body();
    if (empty($body['email']) || empty($body['senha'])) {
        json_response(['message' => 'Informe email e senha.'], 422);
    }

    $stmt = db()->prepare('
        SELECT u.id, u.nome, u.email, u.senha, p.nome as perfil
        FROM usuario u
        LEFT JOIN perfil p ON p.idusuario = u.id AND p.status = "A" AND p.nome IN ("professor", "coordenador")
        WHERE u.email = :email AND u.status = "A"
        LIMIT 1
    ');
    $stmt->execute([':email' => $body['email']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify((string)$body['senha'], (string)$user['senha'])) {
        json_response(['message' => 'Credenciais invalidas.'], 401);
    }

    $perfil = strtolower((string)($user['perfil'] ?? ''));
    if (!in_array($perfil, ['professor', 'coordenador'], true)) {
        json_response(['message' => 'Perfil sem acesso ao sistema. Use professor ou coordenador.'], 403);
    }

    json_response([
        'data' => [
            'id' => $user['id'],
            'nome' => $user['nome'],
            'email' => $user['email'],
            'perfil' => $perfil,
        ]
    ]);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
