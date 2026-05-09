<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,POST,DELETE,OPTIONS', 'Content-Type, X-Role, X-User-Id');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/db_compat.php';
require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

function ensure_sala_table(PDO $pdo): void
{
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS sala (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(120) NOT NULL,
            status VARCHAR(1) NOT NULL DEFAULT \'A\' CHECK (status IN (\'A\',\'I\')),
            idusuario INTEGER NULL,
            dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uk_sala_nome UNIQUE (nome)
        )
    ');

    $columns = db_table_columns($pdo, 'sala', ['sala']);
    if (!in_array('idlocal', $columns, true)) {
        return;
    }

    try {
        $pdo->exec('ALTER TABLE sala DROP COLUMN idlocal CASCADE');
    } catch (Throwable $e) {
        // legado ja migrado ou sem permissao
    }
}

try {
    $pdo = db();
    $auth = require_authenticated();
    $role = $auth['role'];
    $userId = $auth['user_id'];

    ensure_sala_table($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query('SELECT id, nome FROM sala WHERE status = \'A\' ORDER BY nome ASC');
        json_response(['data' => $stmt->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!is_coordinator($role)) {
            json_response(['message' => 'Somente coordenador pode cadastrar salas.'], 403);
        }

        $body = read_json_body();
        $nome = trim((string)($body['nome'] ?? ''));
        if ($nome === '') {
            json_response(['message' => 'Informe o nome da sala.'], 422);
        }

        $stmtExiste = $pdo->prepare('SELECT id, status FROM sala WHERE nome = :nome LIMIT 1');
        $stmtExiste->execute([':nome' => $nome]);
        $existente = $stmtExiste->fetch();
        if ($existente) {
            if ($existente['status'] === 'I') {
                $stmtReativar = $pdo->prepare('UPDATE sala SET status = \'A\' WHERE id = :id');
                $stmtReativar->execute([':id' => (int)$existente['id']]);
                json_response(['message' => 'Sala reativada.', 'data' => ['id' => (int)$existente['id'], 'nome' => $nome]], 200);
            }
            json_response(['message' => 'Ja existe uma sala com esse nome.'], 409);
        }

        $stmt = $pdo->prepare('INSERT INTO sala (nome, status, idusuario) VALUES (:nome, \'A\', :idusuario) RETURNING id');
        $stmt->execute([
            ':nome' => $nome,
            ':idusuario' => $userId,
        ]);
        $id = (int)$stmt->fetchColumn();
        json_response(['message' => 'Sala cadastrada com sucesso.', 'data' => ['id' => $id, 'nome' => $nome]], 201);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!is_coordinator($role)) {
            json_response(['message' => 'Somente coordenador pode remover salas.'], 403);
        }

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id da sala.'], 422);
        }
        $stmt = $pdo->prepare('UPDATE sala SET status = \'I\' WHERE id = :id');
        $stmt->execute([':id' => $id]);
        json_response(['message' => 'Sala removida com sucesso.']);
    }

    json_response(['message' => 'Metodo nao permitido.'], 405);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
