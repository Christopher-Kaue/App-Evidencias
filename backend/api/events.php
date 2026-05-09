<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('GET,POST,PUT,DELETE,OPTIONS', 'Content-Type, X-Role, X-User-Id');

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/db_compat.php';
require_once __DIR__ . '/_lib/response.php';
require_once __DIR__ . '/_lib/auth.php';

function build_event_card_payload(array $body): string
{
    $midias = $body['midias'] ?? [];
    if (!is_array($midias)) {
        $midias = [];
    }

    $midias = array_values(array_filter(array_map(static function ($midia) {
        $valor = trim((string)$midia);
        return $valor === '' ? null : $valor;
    }, $midias)));

    $capa = trim((string)($body['capa'] ?? ''));
    if ($capa !== '' && !in_array($capa, $midias, true)) {
        $capa = '';
    }

    return json_encode([
        'midias' => $midias,
        'capa' => $capa,
    ], JSON_UNESCAPED_UNICODE);
}

function ensure_evento_columns(PDO $pdo): void
{
    $columns = db_table_columns($pdo, 'evento', ['evento']);
    $set = array_flip($columns);
    if (!isset($set['idareacurso'])) {
        try {
            $pdo->exec('ALTER TABLE evento ADD COLUMN idareacurso INTEGER NULL');
        } catch (Throwable $e) {
            // ignora
        }
    }
    if (!isset($set['publicoalvo'])) {
        try {
            $pdo->exec('ALTER TABLE evento ADD COLUMN publicoalvo VARCHAR(255) NULL');
        } catch (Throwable $e) {
            // ignora
        }
    }
    if (!isset($set['cargahoraria'])) {
        try {
            $pdo->exec('ALTER TABLE evento ADD COLUMN cargahoraria DECIMAL(6,2) NULL');
        } catch (Throwable $e) {
            // ignora
        }
    }
    if (!isset($set['qtdprofessores'])) {
        try {
            $pdo->exec('ALTER TABLE evento ADD COLUMN qtdprofessores INTEGER NOT NULL DEFAULT 0');
        } catch (Throwable $e) {
            // ignora
        }
    }
}

function normalizar_evento(array $evento): array
{
    $evento['idareacurso'] = isset($evento['idareacurso']) && $evento['idareacurso'] !== null
        ? (int)$evento['idareacurso']
        : null;
    $evento['publicoalvo'] = isset($evento['publicoalvo']) ? (string)$evento['publicoalvo'] : '';
    $evento['cargahoraria'] = isset($evento['cargahoraria']) && $evento['cargahoraria'] !== null
        ? (float)$evento['cargahoraria']
        : null;
    $evento['qtdprofessores'] = isset($evento['qtdprofessores']) ? (int)$evento['qtdprofessores'] : 0;
    return $evento;
}

function validar_conflito_evento(PDO $pdo, string $dataEvento, string $local, ?int $ignorarId = null): void
{
    $filtroId = $ignorarId !== null ? ' AND id <> :id' : '';

    $stmtHorario = $pdo->prepare("
        SELECT id FROM evento
        WHERE data = :data{$filtroId}
        LIMIT 1
    ");
    $paramsHorario = [':data' => $dataEvento];
    if ($ignorarId !== null) {
        $paramsHorario[':id'] = $ignorarId;
    }
    $stmtHorario->execute($paramsHorario);

    if ($stmtHorario->fetch()) {
        json_response(['message' => 'Conflito detectado: ja existe evento cadastrado nesse horario.'], 409);
    }

    if ($local === '') {
        return;
    }

    $stmtLocal = $pdo->prepare("
        SELECT id FROM evento
        WHERE data = :data
          AND \"local\" = :local{$filtroId}
        LIMIT 1
    ");
    $paramsLocal = [
        ':data' => $dataEvento,
        ':local' => $local,
    ];
    if ($ignorarId !== null) {
        $paramsLocal[':id'] = $ignorarId;
    }
    $stmtLocal->execute($paramsLocal);

    if ($stmtLocal->fetch()) {
        json_response(['message' => 'Conflito detectado: ja existe evento nesse local e horario.'], 409);
    }
}

try {
    $pdo = db();
    $auth = require_authenticated();
    $role = $auth['role'];
    $userId = $auth['user_id'];

    ensure_evento_columns($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (is_coordinator($role)) {
            $stmt = $pdo->query('SELECT id, nome, data, "local" AS local, sala, qtdparticipantes, card, idusuario, idareacurso, publicoalvo, cargahoraria, qtdprofessores FROM evento ORDER BY id DESC LIMIT 200');
            $eventos = array_map('normalizar_evento', $stmt->fetchAll());
            json_response(['data' => $eventos]);
        }

        $stmt = $pdo->prepare('SELECT id, nome, data, "local" AS local, sala, qtdparticipantes, card, idusuario, idareacurso, publicoalvo, cargahoraria, qtdprofessores FROM evento WHERE idusuario = :idusuario ORDER BY id DESC LIMIT 200');
        $stmt->execute([':idusuario' => $userId]);
        $eventos = array_map('normalizar_evento', $stmt->fetchAll());
        json_response(['data' => $eventos]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = read_json_body();
        $campos = ['nome', 'data'];
        foreach ($campos as $campo) {
            if (empty($body[$campo])) {
                json_response(['message' => "Campo obrigatorio: {$campo}"], 422);
            }
        }

        $dataEvento = date('Y-m-d H:i:s', strtotime((string)$body['data']));
        $local = trim((string)($body['local'] ?? ''));
        $sala = trim((string)($body['sala'] ?? ''));
        $idareacurso = isset($body['idareacurso']) && (int)$body['idareacurso'] > 0 ? (int)$body['idareacurso'] : null;
        $cargaHoraria = isset($body['cargahoraria']) && $body['cargahoraria'] !== ''
            ? max(0, (float)$body['cargahoraria'])
            : null;
        $qtdProfessores = max(0, (int)($body['qtdprofessores'] ?? 0));
        $publicoAlvo = trim((string)($body['publicoalvo'] ?? ''));
        if ($publicoAlvo === '') {
            $publicoAlvo = null;
        } elseif (mb_strlen($publicoAlvo) > 255) {
            $publicoAlvo = mb_substr($publicoAlvo, 0, 255);
        }

        validar_conflito_evento($pdo, $dataEvento, $local);

        $stmt = $pdo->prepare('
            INSERT INTO evento (nome, data, "local", sala, qtdparticipantes, card, idusuario, idareacurso, publicoalvo, cargahoraria, qtdprofessores, dtcadastro)
            VALUES (:nome, :data, :local, :sala, :qtdparticipantes, :card, :idusuario, :idareacurso, :publicoalvo, :cargahoraria, :qtdprofessores, NOW())
            RETURNING id
        ');
        $stmt->execute([
            ':nome' => $body['nome'],
            ':data' => $dataEvento,
            ':local' => $local,
            ':sala' => $sala,
            ':qtdparticipantes' => max(0, (int)($body['qtdparticipantes'] ?? 0)),
            ':card' => build_event_card_payload($body),
            ':idusuario' => $userId,
            ':idareacurso' => $idareacurso,
            ':publicoalvo' => $publicoAlvo,
            ':cargahoraria' => $cargaHoraria,
            ':qtdprofessores' => $qtdProfessores,
        ]);
        $novoId = (int)$stmt->fetchColumn();

        $stmtNovo = $pdo->prepare('SELECT id, nome, data, "local" AS local, sala, qtdparticipantes, card, idusuario, idareacurso, publicoalvo, cargahoraria, qtdprofessores FROM evento WHERE id = :id');
        $stmtNovo->execute([':id' => $novoId]);
        $novoEvento = normalizar_evento($stmtNovo->fetch());

        json_response(['message' => 'Evento cadastrado com sucesso.', 'data' => $novoEvento], 201);
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

        $idareacurso = isset($body['idareacurso']) && (int)$body['idareacurso'] > 0 ? (int)$body['idareacurso'] : null;
        $cargaHoraria = isset($body['cargahoraria']) && $body['cargahoraria'] !== ''
            ? max(0, (float)$body['cargahoraria'])
            : null;
        $qtdProfessores = max(0, (int)($body['qtdprofessores'] ?? 0));
        $publicoAlvo = trim((string)($body['publicoalvo'] ?? ''));
        if ($publicoAlvo === '') {
            $publicoAlvo = null;
        } elseif (mb_strlen($publicoAlvo) > 255) {
            $publicoAlvo = mb_substr($publicoAlvo, 0, 255);
        }

        $dataEvento = date('Y-m-d H:i:s', strtotime((string)($body['data'] ?? 'now')));
        $local = trim((string)($body['local'] ?? ''));
        $sala = trim((string)($body['sala'] ?? ''));

        validar_conflito_evento($pdo, $dataEvento, $local, $id);

        $stmt = $pdo->prepare('
            UPDATE evento
            SET nome = :nome,
                data = :data,
                "local" = :local,
                sala = :sala,
                qtdparticipantes = :qtdparticipantes,
                card = :card,
                idareacurso = :idareacurso,
                publicoalvo = :publicoalvo,
                cargahoraria = :cargahoraria,
                qtdprofessores = :qtdprofessores
            WHERE id = :id
        ');
        $stmt->execute([
            ':id' => $id,
            ':nome' => $body['nome'] ?? '',
            ':data' => $dataEvento,
            ':local' => $local,
            ':sala' => $sala,
            ':qtdparticipantes' => max(0, (int)($body['qtdparticipantes'] ?? 0)),
            ':card' => build_event_card_payload($body),
            ':idareacurso' => $idareacurso,
            ':publicoalvo' => $publicoAlvo,
            ':cargahoraria' => $cargaHoraria,
            ':qtdprofessores' => $qtdProfessores,
        ]);

        $stmtAtualizado = $pdo->prepare('SELECT id, nome, data, "local" AS local, sala, qtdparticipantes, card, idusuario, idareacurso, publicoalvo, cargahoraria, qtdprofessores FROM evento WHERE id = :id');
        $stmtAtualizado->execute([':id' => $id]);
        $eventoAtualizado = normalizar_evento($stmtAtualizado->fetch());

        json_response(['message' => 'Evento atualizado com sucesso.', 'data' => $eventoAtualizado]);
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
        try {
            $stmt = $pdo->prepare('DELETE FROM eventopublicoalvo WHERE idevento = :id');
            $stmt->execute([':id' => $id]);
        } catch (Throwable $e) {
            // ignora caso a tabela legada nao exista
        }
        $stmt = $pdo->prepare('DELETE FROM evento WHERE id = :id');
        $stmt->execute([':id' => $id]);
        json_response(['message' => 'Evento excluido com sucesso.']);
    }

    json_response(['message' => 'Metodo nao permitido.'], 405);
} catch (Throwable $e) {
    json_response(['message' => 'Erro interno.', 'detail' => $e->getMessage()], 500);
}
