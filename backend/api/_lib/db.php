<?php

declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);
        if ($key === '') {
            continue;
        }

        $quoted = strlen($value) >= 2
            && (
                ($value[0] === '"' && substr($value, -1) === '"')
                || ($value[0] === "'" && substr($value, -1) === "'")
            );
        if ($quoted) {
            $value = substr($value, 1, -1);
        }

        if (getenv($key) === false) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

/**
 * Conexao unica (singleton) com PostgreSQL.
 * Requer extensao PHP pdo_pgsql.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    load_env_file(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env');

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '5432';
    $name = getenv('DB_NAME') ?: 'app_evidencias';
    $user = getenv('DB_USER') ?: 'postgres';
    $pass = getenv('DB_PASS') ?? '';
    if ($pass === false) {
        $pass = '';
    }

    $ssl = getenv('DB_SSL');
    $sslOn = $ssl === '1' || strcasecmp((string) $ssl, 'true') === 0;
    $sslMode = $sslOn ? 'require' : 'prefer';

    $dsn = "pgsql:host={$host};port={$port};dbname={$name};sslmode={$sslMode}";

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    $pdo = new PDO($dsn, $user, (string) $pass, $options);

    return $pdo;
}
