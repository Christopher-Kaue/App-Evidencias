<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,POST,PUT,DELETE,OPTIONS', 'Content-Type, X-Role, X-User-Id');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

try {
    $pdo = db();
    $auth = require_authenticated();
    $role = $auth['role'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (is_coordinator($role)) {
            $stmt = $pdo->query('
                SELECT
                    u.id,
                    u.nome,
                    u.email,
                    u.celular,
                    u.status,
                    CASE
                        WHEN SUM(CASE WHEN p.nome = \'coordenador\' THEN 1 ELSE 0 END) > 0 THEN \'coordenador\'
                        ELSE \'professor\'
                    END AS perfil
                FROM usuario u
                INNER JOIN perfil p ON p.idusuario = u.id AND p.status = \'A\' AND p.nome IN (\'professor\', \'coordenador\')
                GROUP BY u.id, u.nome, u.email, u.celular, u.status
                ORDER BY u.id DESC
            ');
            json_response(['data' => $stmt->fetchAll()]);
        }

        $stmt = $pdo->query('SELECT id, nome, celular FROM usuario WHERE status = \'A\' ORDER BY nome ASC');
        json_response(['data' => $stmt->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_coordinator();
        $body = read_json_body();
        if (empty($body['nome']) || empty($body['email']) || empty($body['senha'])) {
            json_response(['message' => 'Campos obrigatorios: nome, email e senha.'], 422);
        }

        $email = strtolower(trim((string)$body['email']));
        $hash = password_hash((string)$body['senha'], PASSWORD_BCRYPT);
        $perfil = strtolower((string)($body['perfil'] ?? 'professor'));
        if (!in_array($perfil, ['professor', 'coordenador'], true)) {
            $perfil = 'professor';
        }

        $stmtExiste = $pdo->prepare('SELECT id, status FROM usuario WHERE email = :email LIMIT 1');
        $stmtExiste->execute([':email' => $email]);
        $existente = $stmtExiste->fetch();

        if ($existente && $existente['status'] === 'A') {
            json_response(['message' => 'Ja existe um usuario ativo com este email.'], 409);
        }

        if ($existente) {
            $userId = (int)$existente['id'];
            $stmtUpdate = $pdo->prepare('
                UPDATE usuario
                SET nome = :nome,
                    celular = :celular,
                    senha = :senha,
                    status = \'A\'
                WHERE id = :id
            ');
            $stmtUpdate->execute([
                ':nome' => $body['nome'],
                ':celular' => $body['celular'] ?? '',
                ':senha' => $hash,
                ':id' => $userId,
            ]);

            $stmtDesativaPerfis = $pdo->prepare('UPDATE perfil SET status = \'I\' WHERE idusuario = :id');
            $stmtDesativaPerfis->execute([':id' => $userId]);

            $stmtPerfilExist = $pdo->prepare('SELECT id FROM perfil WHERE idusuario = :id AND nome = :nome LIMIT 1');
            $stmtPerfilExist->execute([':id' => $userId, ':nome' => $perfil]);
            $perfilExistente = $stmtPerfilExist->fetch();

            if ($perfilExistente) {
                $stmtAtivarPerfil = $pdo->prepare('UPDATE perfil SET status = \'A\' WHERE id = :pid');
                $stmtAtivarPerfil->execute([':pid' => (int)$perfilExistente['id']]);
            } else {
                $stmtNovoPerfil = $pdo->prepare('INSERT INTO perfil (nome, status, idusuario, dtcadastro) VALUES (:nome, \'A\', :idusuario, NOW())');
                $stmtNovoPerfil->execute([':nome' => $perfil, ':idusuario' => $userId]);
            }
        } else {
            $stmt = $pdo->prepare('
                INSERT INTO usuario (nome, email, celular, senha, status, idusuario, dtcadastro)
                VALUES (:nome, :email, :celular, :senha, \'A\', :criador, NOW())
                RETURNING id
            ');
            $stmt->execute([
                ':nome' => $body['nome'],
                ':email' => $email,
                ':celular' => $body['celular'] ?? '',
                ':senha' => $hash,
                ':criador' => $auth['user_id'],
            ]);
            $userId = (int)$stmt->fetchColumn();

            $stmtPerfil = $pdo->prepare('INSERT INTO perfil (nome, status, idusuario, dtcadastro) VALUES (:nome, \'A\', :idusuario, NOW())');
            $stmtPerfil->execute([
                ':nome' => $perfil,
                ':idusuario' => $userId,
            ]);
        }

        $stmtNovo = $pdo->prepare('
            SELECT u.id, u.nome, u.email, u.celular, u.status, COALESCE(p.nome, \'professor\') AS perfil
            FROM usuario u
            LEFT JOIN perfil p ON p.idusuario = u.id AND p.status = \'A\' AND p.nome IN (\'professor\', \'coordenador\')
            WHERE u.id = :id
            ORDER BY CASE p.nome WHEN \'coordenador\' THEN 0 WHEN \'professor\' THEN 1 ELSE 2 END
            LIMIT 1
        ');
        $stmtNovo->execute([':id' => $userId]);
        $novoUsuario = $stmtNovo->fetch();

        json_response(['message' => 'Usuario cadastrado com sucesso.', 'data' => $novoUsuario], 201);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        require_coordinator();
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do usuario.'], 422);
        }

        $stmtPerfilAtual = $pdo->prepare('SELECT nome FROM perfil WHERE idusuario = :idusuario AND status = \'A\' LIMIT 1');
        $stmtPerfilAtual->execute([':idusuario' => $id]);
        $perfilAtual = strtolower((string)($stmtPerfilAtual->fetchColumn() ?: ''));
        if (!in_array($perfilAtual, ['professor', 'coordenador'], true)) {
            json_response(['message' => 'Somente usuarios professor/coordenador podem ser alterados.'], 403);
        }

        $email = strtolower(trim((string)($body['email'] ?? '')));
        if ($email === '') {
            json_response(['message' => 'Informe o email do usuario.'], 422);
        }

        $stmtEmail = $pdo->prepare('SELECT id, status FROM usuario WHERE email = :email AND id <> :id LIMIT 1');
        $stmtEmail->execute([':email' => $email, ':id' => $id]);
        $emailEmUso = $stmtEmail->fetch();
        if ($emailEmUso) {
            $mensagem = $emailEmUso['status'] === 'A'
                ? 'Ja existe um usuario ativo com este email.'
                : 'Este email pertence a um usuario excluido. Crie um novo usuario com esse email para reativar o cadastro antigo.';
            json_response(['message' => $mensagem], 409);
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
            ':email' => $email,
            ':celular' => $body['celular'] ?? '',
            ':status' => ($body['status'] ?? 'A') === 'I' ? 'I' : 'A',
        ]);

        $novaSenha = isset($body['senha']) ? (string)$body['senha'] : '';
        if ($novaSenha !== '') {
            if (mb_strlen($novaSenha) < 6) {
                json_response(['message' => 'A senha deve ter pelo menos 6 caracteres.'], 422);
            }
            $stmtSenha = $pdo->prepare('UPDATE usuario SET senha = :senha WHERE id = :id');
            $stmtSenha->execute([
                ':senha' => password_hash($novaSenha, PASSWORD_BCRYPT),
                ':id' => $id,
            ]);
        }

        $perfil = strtolower((string)($body['perfil'] ?? ''));
        if ($perfil !== '') {
            if (!in_array($perfil, ['professor', 'coordenador'], true)) {
                $perfil = 'professor';
            }
            $stmtPerfil = $pdo->prepare('UPDATE perfil SET nome = :nome WHERE idusuario = :idusuario');
            $stmtPerfil->execute([':nome' => $perfil, ':idusuario' => $id]);
            if ($stmtPerfil->rowCount() === 0) {
                $stmtNovoPerfil = $pdo->prepare('INSERT INTO perfil (nome, status, idusuario, dtcadastro) VALUES (:nome, \'A\', :idusuario, NOW())');
                $stmtNovoPerfil->execute([':nome' => $perfil, ':idusuario' => $id]);
            }
        }

        $stmtAtualizado = $pdo->prepare('
            SELECT u.id, u.nome, u.email, u.celular, u.status, COALESCE(p.nome, \'professor\') AS perfil
            FROM usuario u
            LEFT JOIN perfil p ON p.idusuario = u.id AND p.status = \'A\' AND p.nome IN (\'professor\', \'coordenador\')
            WHERE u.id = :id
            ORDER BY CASE p.nome WHEN \'coordenador\' THEN 0 WHEN \'professor\' THEN 1 ELSE 2 END
            LIMIT 1
        ');
        $stmtAtualizado->execute([':id' => $id]);
        $usuarioAtualizado = $stmtAtualizado->fetch();

        json_response(['message' => 'Usuario atualizado com sucesso.', 'data' => $usuarioAtualizado]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        require_coordinator();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do usuario.'], 422);
        }

        $stmtPerfilAtual = $pdo->prepare('SELECT nome FROM perfil WHERE idusuario = :idusuario AND status = \'A\' LIMIT 1');
        $stmtPerfilAtual->execute([':idusuario' => $id]);
        $perfilAtual = strtolower((string)($stmtPerfilAtual->fetchColumn() ?: ''));
        if (!in_array($perfilAtual, ['professor', 'coordenador'], true)) {
            json_response(['message' => 'Somente usuarios professor/coordenador podem ser excluidos.'], 403);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('UPDATE perfil SET status = \'I\' WHERE idusuario = :id');
        $stmt->execute([':id' => $id]);
        $stmt = $pdo->prepare('UPDATE usuario SET status = \'I\' WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $pdo->commit();

        json_response(['message' => 'Usuario excluido com sucesso.']);
    }

    json_response(['message' => 'Metodo nao permitido.'], 405);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
