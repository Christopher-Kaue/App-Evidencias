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
    $userId = $auth['user_id'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (is_coordinator($role)) {
            $stmt = $pdo->query('SELECT id, nome, data, local, sala, qtdparticipantes, card, idusuario FROM evento ORDER BY data DESC');
            json_response(['data' => $stmt->fetchAll()]);
        }

        $stmt = $pdo->prepare('SELECT id, nome, data, local, sala, qtdparticipantes, card, idusuario FROM evento WHERE idusuario = :idusuario ORDER BY data DESC');
        $stmt->execute([':idusuario' => $userId]);
        json_response(['data' => $stmt->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = read_json_body();
        $campos = ['nome', 'data', 'local', 'sala', 'qtdparticipantes'];
        foreach ($campos as $campo) {
            if (empty($body[$campo])) {
                json_response(['message' => "Campo obrigatorio: {$campo}"], 422);
            }
        }

        $stmtConflito = $pdo->prepare('
            SELECT id FROM evento
            WHERE data = :data
              AND local = :local
              AND sala = :sala
            LIMIT 1
        ');
        $stmtConflito->execute([
            ':data' => date('Y-m-d H:i:s', strtotime((string)$body['data'])),
            ':local' => $body['local'],
            ':sala' => $body['sala'],
        ]);

        if ($stmtConflito->fetch()) {
            json_response(['message' => 'Conflito detectado: ja existe evento nesse horario/local/sala.'], 409);
        }

        $stmt = $pdo->prepare('
            INSERT INTO evento (nome, data, local, sala, qtdparticipantes, card, idusuario, dtcadastro)
            VALUES (:nome, :data, :local, :sala, :qtdparticipantes, :card, :idusuario, NOW())
        ');
        $midias = $body['midias'] ?? [];
        if (!is_array($midias)) {
            $midias = [];
        }
        $stmt->execute([
            ':nome' => $body['nome'],
            ':data' => date('Y-m-d H:i:s', strtotime((string)$body['data'])),
            ':local' => $body['local'],
            ':sala' => $body['sala'],
            ':qtdparticipantes' => (int)$body['qtdparticipantes'],
            ':card' => json_encode($midias, JSON_UNESCAPED_UNICODE),
            ':idusuario' => $userId,
        ]);

        json_response(['message' => 'Evento cadastrado com sucesso.'], 201);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do evento.'], 422);
        }

        $stmtEvento = $pdo->prepare('SELECT idusuario FROM evento WHERE id = :id');
        $stmtEvento->execute([':id' => $id]);
        $evento = $stmtEvento->fetch();
        if (!$evento) {
            json_response(['message' => 'Evento nao encontrado.'], 404);
        }
        if (!is_coordinator($role) && (int)$evento['idusuario'] !== $userId) {
            json_response(['message' => 'Sem permissao para alterar este evento.'], 403);
        }

        $midias = $body['midias'] ?? [];
        if (!is_array($midias)) {
            $midias = [];
        }
        $stmt = $pdo->prepare('
            UPDATE evento
            SET nome = :nome,
                data = :data,
                local = :local,
                sala = :sala,
                qtdparticipantes = :qtdparticipantes,
                card = :card
            WHERE id = :id
        ');
        $stmt->execute([
            ':id' => $id,
            ':nome' => $body['nome'] ?? '',
            ':data' => date('Y-m-d H:i:s', strtotime((string)($body['data'] ?? 'now'))),
            ':local' => $body['local'] ?? '',
            ':sala' => $body['sala'] ?? '',
            ':qtdparticipantes' => (int)($body['qtdparticipantes'] ?? 0),
            ':card' => json_encode($midias, JSON_UNESCAPED_UNICODE),
        ]);
        json_response(['message' => 'Evento atualizado com sucesso.']);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!is_coordinator($role)) {
            json_response(['message' => 'Somente coordenador pode excluir eventos.'], 403);
        }
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do evento.'], 422);
        }

        $stmt = $pdo->prepare('DELETE FROM eventoevidencia WHERE idevento = :id');
        $stmt->execute([':id' => $id]);
        $stmt = $pdo->prepare('DELETE FROM evento WHERE id = :id');
        $stmt->execute([':id' => $id]);
        json_response(['message' => 'Evento excluido com sucesso.']);
    }

    json_response(['message' => 'Metodo nao permitido.'], 405);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
