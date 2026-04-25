<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,PUT,DELETE,OPTIONS', 'Content-Type, X-Role, X-User-Id');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'PUT', 'DELETE'], true)) {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

try {
    $auth = require_authenticated();
    $role = $auth['role'];
    $userId = $auth['user_id'];
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (is_coordinator($role)) {
            $totalEventos = (int)$pdo->query('SELECT COUNT(*) FROM evento')->fetchColumn();
            $totalUsuarios = (int)$pdo->query('SELECT COUNT(*) FROM usuario')->fetchColumn();
            $totalEvidencias = (int)$pdo->query('SELECT COUNT(*) FROM eventoevidencia')->fetchColumn();
            $mediaParticipantes = (float)$pdo->query('SELECT COALESCE(AVG(qtdparticipantes), 0) FROM evento')->fetchColumn();
            $eventos = $pdo->query('SELECT id, nome, data, local, sala, qtdparticipantes, idusuario FROM evento ORDER BY data DESC')->fetchAll();
        } else {
            $stmtTotal = $pdo->prepare('SELECT COUNT(*) FROM evento WHERE idusuario = :idusuario');
            $stmtTotal->execute([':idusuario' => $userId]);
            $totalEventos = (int)$stmtTotal->fetchColumn();
            $totalUsuarios = 0;
            $stmtEvid = $pdo->prepare('SELECT COUNT(*) FROM eventoevidencia ee JOIN evento e ON e.id = ee.idevento WHERE e.idusuario = :idusuario');
            $stmtEvid->execute([':idusuario' => $userId]);
            $totalEvidencias = (int)$stmtEvid->fetchColumn();
            $stmtMedia = $pdo->prepare('SELECT COALESCE(AVG(qtdparticipantes), 0) FROM evento WHERE idusuario = :idusuario');
            $stmtMedia->execute([':idusuario' => $userId]);
            $mediaParticipantes = (float)$stmtMedia->fetchColumn();
            $stmtEventos = $pdo->prepare('SELECT id, nome, data, local, sala, qtdparticipantes, idusuario FROM evento WHERE idusuario = :idusuario ORDER BY data DESC');
            $stmtEventos->execute([':idusuario' => $userId]);
            $eventos = $stmtEventos->fetchAll();
        }

        json_response([
            'data' => [
                'total_eventos' => $totalEventos,
                'total_usuarios' => $totalUsuarios,
                'total_evidencias' => $totalEvidencias,
                'media_participantes' => round($mediaParticipantes, 2),
                'eventos' => $eventos,
            ]
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        require_coordinator();
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do evento.'], 422);
        }

        $stmt = $pdo->prepare('
            UPDATE evento
            SET nome = :nome,
                data = :data,
                local = :local,
                sala = :sala,
                qtdparticipantes = :qtdparticipantes
            WHERE id = :id
        ');
        $stmt->execute([
            ':id' => $id,
            ':nome' => $body['nome'] ?? '',
            ':data' => date('Y-m-d H:i:s', strtotime((string)($body['data'] ?? 'now'))),
            ':local' => $body['local'] ?? '',
            ':sala' => $body['sala'] ?? '',
            ':qtdparticipantes' => (int)($body['qtdparticipantes'] ?? 0),
        ]);
        json_response(['message' => 'Relatorio atualizado com sucesso.']);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        require_coordinator();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['message' => 'Informe o id do evento.'], 422);
        }
        $stmt = $pdo->prepare('DELETE FROM eventoevidencia WHERE idevento = :id');
        $stmt->execute([':id' => $id]);
        $stmt = $pdo->prepare('DELETE FROM evento WHERE id = :id');
        $stmt->execute([':id' => $id]);
        json_response(['message' => 'Relatorio excluido com sucesso.']);
    }
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
