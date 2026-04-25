<?php

require_once __DIR__ . '/response.php';

function get_request_role(): string
{
    return strtolower(trim((string)($_SERVER['HTTP_X_ROLE'] ?? '')));
}

function get_request_user_id(): int
{
    return (int)($_SERVER['HTTP_X_USER_ID'] ?? 0);
}

function is_coordinator(string $role): bool
{
    return in_array($role, ['coordenador', 'administrador'], true);
}

function require_authenticated(): array
{
    $role = get_request_role();
    $userId = get_request_user_id();
    if ($userId <= 0 || $role === '') {
        json_response(['message' => 'Nao autenticado.'], 401);
    }

    return ['role' => $role, 'user_id' => $userId];
}

function require_coordinator(): array
{
    $auth = require_authenticated();
    if (!is_coordinator($auth['role'])) {
        json_response(['message' => 'Acesso negado. Perfil coordenador obrigatorio.'], 403);
    }

    return $auth;
}
