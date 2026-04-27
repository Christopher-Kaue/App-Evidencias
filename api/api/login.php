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
    $emailRaw = isset($body['email']) ? trim((string)$body['email']) : '';
    $senha = isset($body['senha']) ? (string)$body['senha'] : '';
    if ($emailRaw === '' || $senha === '') {
        json_response(['message' => 'Informe email e senha.'], 422);
    }

    // Normaliza email (mesmo utilizador com maiusculas/minusculas no browser)
    $email = strtolower($emailRaw);

    $stmt = db()->prepare('
        SELECT id, nome, email, senha
        FROM usuario
        WHERE email = :email AND status = "A"
        LIMIT 1
    ');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(\PDO::FETCH_ASSOC);

    if (!$user || !password_verify($senha, (string)$user['senha'])) {
        json_response(['message' => 'Credenciais invalidas.'], 401);
    }

    // Perfis permitidos num segundo passo (LEFT JOIN + LIMIT podia falhar em dados incompletos ou ordem ambigua)
    $stmtPerfil = db()->prepare('
        SELECT nome FROM perfil
        WHERE idusuario = :uid AND status = "A" AND nome IN ("professor", "coordenador")
        ORDER BY FIELD(nome, "coordenador", "professor")
        LIMIT 1
    ');
    $stmtPerfil->execute([':uid' => $user['id']]);
    $rowPerfil = $stmtPerfil->fetch(\PDO::FETCH_ASSOC);
    $perfilNome = isset($rowPerfil['nome']) ? strtolower((string)$rowPerfil['nome']) : '';

    if (!in_array($perfilNome, ['professor', 'coordenador'], true)) {
        json_response(['message' => 'Perfil sem acesso ao sistema. Use professor ou coordenador.'], 403);
    }

    json_response([
        'data' => [
            'id' => (int)$user['id'],
            'nome' => $user['nome'],
            'email' => $user['email'],
            'perfil' => $perfilNome,
        ]
    ]);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
