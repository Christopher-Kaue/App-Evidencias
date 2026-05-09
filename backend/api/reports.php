<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,PUT,DELETE,OPTIONS', 'Content-Type, X-Role, X-User-Id');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

function parse_date_param(?string $value, bool $endOfDay = false): ?string
{
    if ($value === null || trim($value) === '') {
        return null;
    }
    $dt = DateTime::createFromFormat('Y-m-d', trim($value));
    if (!$dt) {
        json_response(['message' => 'Data invalida. Use o formato YYYY-MM-DD.'], 422);
    }
    if ($endOfDay) {
        $dt->setTime(23, 59, 59);
    } else {
        $dt->setTime(0, 0, 0);
    }
    return $dt->format('Y-m-d H:i:s');
}

function build_date_filter_sql(?string $startDate, ?string $endDate): array
{
    $parts = [];
    $params = [];
    if ($startDate !== null) {
        $parts[] = 'e.data >= :start_date';
        $params[':start_date'] = $startDate;
    }
    if ($endDate !== null) {
        $parts[] = 'e.data <= :end_date';
        $params[':end_date'] = $endDate;
    }
    $sql = '';
    if (count($parts) > 0) {
        $sql = ' AND ' . implode(' AND ', $parts);
    }
    return ['sql' => $sql, 'params' => $params];
}

function get_report_data(PDO $pdo, string $role, int $userId, ?string $startDate, ?string $endDate): array
{
    $dateFilter = build_date_filter_sql($startDate, $endDate);
    $dateSql = $dateFilter['sql'];
    $dateParams = $dateFilter['params'];

    if (is_coordinator($role)) {
        $stmtTotalEventos = $pdo->prepare('SELECT COUNT(*) FROM evento e WHERE 1=1' . $dateSql);
        $stmtTotalEventos->execute($dateParams);
        $totalEventos = (int)$stmtTotalEventos->fetchColumn();

        $totalUsuarios = (int)$pdo->query('SELECT COUNT(*) FROM usuario')->fetchColumn();

        $stmtEvid = $pdo->prepare('
            SELECT COUNT(*)
            FROM eventoevidencia ee
            JOIN evento e ON e.id = ee.idevento
            WHERE 1=1' . $dateSql
        );
        $stmtEvid->execute($dateParams);
        $totalEvidencias = (int)$stmtEvid->fetchColumn();

        $stmtMedia = $pdo->prepare('SELECT COALESCE(AVG(e.qtdparticipantes), 0) FROM evento e WHERE 1=1' . $dateSql);
        $stmtMedia->execute($dateParams);
        $mediaParticipantes = (float)$stmtMedia->fetchColumn();

        $stmtEventos = $pdo->prepare('
            SELECT e.id, e.nome, e.data, e."local" AS local, e.sala, e.qtdparticipantes, e.idusuario
            FROM evento e
            WHERE 1=1' . $dateSql . '
            ORDER BY e.data DESC
            LIMIT 500
        ');
        $stmtEventos->execute($dateParams);
        $eventos = $stmtEventos->fetchAll();
    } else {
        $params = array_merge([':idusuario' => $userId], $dateParams);

        $stmtTotal = $pdo->prepare('SELECT COUNT(*) FROM evento e WHERE e.idusuario = :idusuario' . $dateSql);
        $stmtTotal->execute($params);
        $totalEventos = (int)$stmtTotal->fetchColumn();

        $totalUsuarios = 0;

        $stmtEvid = $pdo->prepare('
            SELECT COUNT(*)
            FROM eventoevidencia ee
            JOIN evento e ON e.id = ee.idevento
            WHERE e.idusuario = :idusuario' . $dateSql
        );
        $stmtEvid->execute($params);
        $totalEvidencias = (int)$stmtEvid->fetchColumn();

        $stmtMedia = $pdo->prepare('SELECT COALESCE(AVG(e.qtdparticipantes), 0) FROM evento e WHERE e.idusuario = :idusuario' . $dateSql);
        $stmtMedia->execute($params);
        $mediaParticipantes = (float)$stmtMedia->fetchColumn();

        $stmtEventos = $pdo->prepare('
            SELECT e.id, e.nome, e.data, e."local" AS local, e.sala, e.qtdparticipantes, e.idusuario
            FROM evento e
            WHERE e.idusuario = :idusuario' . $dateSql . '
            ORDER BY e.data DESC
            LIMIT 500
        ');
        $stmtEventos->execute($params);
        $eventos = $stmtEventos->fetchAll();
    }

    return [
        'total_eventos' => $totalEventos,
        'total_usuarios' => $totalUsuarios,
        'total_evidencias' => $totalEvidencias,
        'media_participantes' => round($mediaParticipantes, 2),
        'eventos' => $eventos,
    ];
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'PUT', 'DELETE'], true)) {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

try {
    $auth = require_authenticated();
    $role = $auth['role'];
    $userId = $auth['user_id'];
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $startDate = parse_date_param(isset($_GET['start_date']) ? (string)$_GET['start_date'] : null, false);
        $endDate = parse_date_param(isset($_GET['end_date']) ? (string)$_GET['end_date'] : null, true);
        if ($startDate !== null && $endDate !== null && strtotime($startDate) > strtotime($endDate)) {
            json_response(['message' => 'Data inicial nao pode ser maior que a data final.'], 422);
        }
        $report = get_report_data($pdo, $role, $userId, $startDate, $endDate);

        json_response([
            'data' => [
                'total_eventos' => $report['total_eventos'],
                'total_usuarios' => $report['total_usuarios'],
                'total_evidencias' => $report['total_evidencias'],
                'media_participantes' => $report['media_participantes'],
                'eventos' => $report['eventos'],
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
                "local" = :local,
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
