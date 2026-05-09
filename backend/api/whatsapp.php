<?php

require_once __DIR__ . '/_lib/cors.php';
apply_cors('POST,OPTIONS', 'Content-Type');

require_once __DIR__ . '/_lib/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['message' => 'Metodo nao permitido.'], 405);
}

$body = read_json_body();
if (empty($body['telefone']) || empty($body['mensagem'])) {
    json_response(['message' => 'Campos obrigatorios: telefone e mensagem.'], 422);
}

json_response([
    'message' => 'Notificacao registrada para envio.',
    'info' => 'Integre este endpoint a uma API oficial do WhatsApp (ex: Twilio/Meta) em producao.'
]);
