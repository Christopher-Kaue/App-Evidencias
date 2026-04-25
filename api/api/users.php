<?php

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Role, X-User-Id');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    $pdo = db();
    $auth = require_authenticated();
    $role = $auth['role'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (is_coordinator($role)) {
            $stmt = $pdo->query('
                SELECT u.id, u.nome, u.email, u.celular, u.status, COALESCE(p.nome, "professor") AS perfil
                FROM usuario u
                LEFT JOIN perfil p ON p.idusuario = u.id AND p.status = "A"
                WHERE COALESCE(p.nome, "") IN ("professor", "coordenador")
                ORDER BY u.id DESC
            ');
            json_response(['data' => $stmt->fetchAll()]);
        }

        $stmt = $pdo->query('SELECT id, nome, celular FROM usuario WHERE status = "A" ORDER BY nome ASC');
        json_response(['data' => $stmt->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_coordinator();
        $body = read_json_body();
        if (empty($body['nome']) || empty($body['email']) || empty($body['senha'])) {
            json_response(['message' => 'Campos obrigatorios: nome, email e senha.'], 422);
        }

        $hash = password_hash((string)$body['senha'], PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('
            INSERT INTO usuario (nome, email, celular, senha, status, idusuario, dtcadastro)
            VALUES (:nome, :email, :celular, :senha, "A", 1, NOW())
        ');
        $stmt->execute([
            ':nome' => $body['nome'],
            ':email' => $body['email'],
            ':celular' => $body['celular'] ?? '',
            ':senha' => $hash,
        ]);
        $newUserId = (int)$pdo->lastInsertId();
        $perfil = strtolower((string)($body['perfil'] ?? 'professor'));
        if (!in_array($perfil, ['professor', 'coordenador'], true)) {
            $perfil = 'professor';
        }

        $stmtPerfil = $pdo->prepare('INSERT INTO perfil (nome, status, idusuario, dtcadastro) VALUES (:nome, "A", :idusuario, NOW())');
        $stmtPerfil->execute([
            ':nome' => $perfil,
            ':idusuario' => $newUserId,
        ]);

        json_response(['message' => 'Usuario cadastrado com sucesso.'], 201);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        require_coordinator();
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do usuario.'], 422);
        }

        $stmtPerfilAtual = $pdo->prepare('SELECT nome FROM perfil WHERE idusuario = :idusuario AND status = "A" LIMIT 1');
        $stmtPerfilAtual->execute([':idusuario' => $id]);
        $perfilAtual = strtolower((string)($stmtPerfilAtual->fetchColumn() ?: ''));
        if (!in_array($perfilAtual, ['professor', 'coordenador'], true)) {
            json_response(['message' => 'Somente usuarios professor/coordenador podem ser alterados.'], 403);
        }

        $stmt = $pdo->prepare('
            UPDATE usuario
            SET nome = :nome,
                email = :email,
                celular = :celular,
                status = :status
            WHERE id = :id
        ');
        $stmt->execute([
            ':id' => $id,
            ':nome' => $body['nome'] ?? '',
            ':email' => $body['email'] ?? '',
            ':celular' => $body['celular'] ?? '',
            ':status' => ($body['status'] ?? 'A') === 'I' ? 'I' : 'A',
        ]);

        $perfil = strtolower((string)($body['perfil'] ?? ''));
        if ($perfil !== '') {
            if (!in_array($perfil, ['professor', 'coordenador'], true)) {
                $perfil = 'professor';
            }
            $stmtPerfil = $pdo->prepare('UPDATE perfil SET nome = :nome WHERE idusuario = :idusuario');
            $stmtPerfil->execute([':nome' => $perfil, ':idusuario' => $id]);
            if ($stmtPerfil->rowCount() === 0) {
                $stmtNovoPerfil = $pdo->prepare('INSERT INTO perfil (nome, status, idusuario, dtcadastro) VALUES (:nome, "A", :idusuario, NOW())');
                $stmtNovoPerfil->execute([':nome' => $perfil, ':idusuario' => $id]);
            }
        }

        json_response(['message' => 'Usuario atualizado com sucesso.']);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        require_coordinator();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do usuario.'], 422);
        }

        $stmtPerfilAtual = $pdo->prepare('SELECT nome FROM perfil WHERE idusuario = :idusuario AND status = "A" LIMIT 1');
        $stmtPerfilAtual->execute([':idusuario' => $id]);
        $perfilAtual = strtolower((string)($stmtPerfilAtual->fetchColumn() ?: ''));
        if (!in_array($perfilAtual, ['professor', 'coordenador'], true)) {
            json_response(['message' => 'Somente usuarios professor/coordenador podem ser excluidos.'], 403);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('UPDATE perfil SET status = "I" WHERE idusuario = :id');
        $stmt->execute([':id' => $id]);
        $stmt = $pdo->prepare('UPDATE usuario SET status = "I" WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $pdo->commit();

        json_response(['message' => 'Usuario excluido com sucesso.']);
    }

    json_response(['message' => 'Metodo nao permitido.'], 405);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
