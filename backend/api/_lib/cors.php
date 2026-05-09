<?php

declare(strict_types=1);

/**
 * CORS + preflight OPTIONS. Deve ser chamado antes de qualquer saida e antes de includes que possam falhar.
 */
function apply_cors(string $allowMethods, string $allowHeaders): void
{
    if (headers_sent()) {
        return;
    }
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: ' . $allowMethods);
    header('Access-Control-Allow-Headers: ' . $allowHeaders);
    header('Access-Control-Max-Age: 86400');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
