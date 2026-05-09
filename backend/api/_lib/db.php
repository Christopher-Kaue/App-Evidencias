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
 * Interpreta DATABASE_URL (postgresql:// ou postgres://), usado por Neon, Supabase, etc.
 *
 * @return array{host:string,port:string,name:string,user:string,pass:string,sslmode:string}|null
 */
function parse_postgres_database_url(string $url): ?array
{
    $trimmed = trim($url);
    if ($trimmed === '') {
        return null;
    }

    $parts = parse_url($trimmed);
    if ($parts === false || empty($parts['scheme'])) {
        return null;
    }

    $scheme = strtolower((string) $parts['scheme']);
    if (!in_array($scheme, ['postgres', 'postgresql'], true)) {
        return null;
    }

    $host = isset($parts['host']) ? (string) $parts['host'] : '127.0.0.1';
    $port = isset($parts['port']) ? (string) $parts['port'] : '5432';
    $user = isset($parts['user']) ? rawurldecode((string) $parts['user']) : 'postgres';
    $pass = isset($parts['pass']) ? rawurldecode((string) $parts['pass']) : '';
    $path = isset($parts['path']) ? (string) $parts['path'] : '';
    $name = $path !== '' ? ltrim($path, '/') : 'postgres';
    if ($name === '') {
        $name = 'postgres';
    }

    $sslmode = 'prefer';
    if (!empty($parts['query'])) {
        parse_str((string) $parts['query'], $q);
        if (isset($q['sslmode']) && is_string($q['sslmode']) && $q['sslmode'] !== '') {
            $sslmode = $q['sslmode'];
        }
    }

    return [
        'host' => $host,
        'port' => $port,
        'name' => $name,
        'user' => $user,
        'pass' => $pass,
        'sslmode' => $sslmode,
    ];
}

/**
 * Neon routing sem SNI completo (PHP/libpq na Vercel): exige endpoint no handshake.
 *
 * @see https://neon.com/docs/connect/connection-errors#the-endpoint-id-is-not-specified
 */
function neon_endpoint_id_from_host(string $host): ?string
{
    if ($host === '' || !str_contains($host, '.neon.tech')) {
        return null;
    }

    $first = explode('.', $host, 2)[0];
    if ($first === '' || !str_starts_with($first, 'ep-')) {
        return null;
    }

    if (str_ends_with($first, '-pooler')) {
        return substr($first, 0, -strlen('-pooler'));
    }

    return $first;
}

/**
 * libpq aceita `dbname=nome options=endpoint=ep-...` no campo dbname (workaround Neon).
 */
function pgsql_dbname_for_dsn(string $logicalDbName, string $host): string
{
    $endpoint = neon_endpoint_id_from_host($host);
    if ($endpoint === null) {
        return $logicalDbName;
    }

    return $logicalDbName . ' options=endpoint=' . $endpoint;
}

/**
 * Conexao unica (singleton) com PostgreSQL.
 * Requer extensao PHP pdo_pgsql.
 *
 * Prioridade: DATABASE_URL (Neon/Vercel) > DB_HOST / DB_NAME / ...
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    load_env_file(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env');

    $dbUrl = getenv('DATABASE_URL');
    $parsedUrl = is_string($dbUrl) ? parse_postgres_database_url($dbUrl) : null;

    if ($parsedUrl !== null) {
        $host = $parsedUrl['host'];
        $port = $parsedUrl['port'];
        $name = $parsedUrl['name'];
        $user = $parsedUrl['user'];
        $pass = $parsedUrl['pass'];
        $sslMode = $parsedUrl['sslmode'];
    } else {
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
    }

    $dbForDsn = pgsql_dbname_for_dsn($name, $host);
    $dsn = "pgsql:host={$host};port={$port};dbname={$dbForDsn};sslmode={$sslMode}";

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    $pdo = new PDO($dsn, $user, (string) $pass, $options);

    return $pdo;
}
