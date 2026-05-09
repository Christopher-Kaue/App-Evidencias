<?php

declare(strict_types=1);

/**
 * Colunas existentes em uma tabela (PostgreSQL, schema public).
 *
 * @param  array<int, string>  $allowedTables
 * @return array<int, string>
 */
function db_table_columns(PDO $pdo, string $table, array $allowedTables): array
{
    if (!in_array($table, $allowedTables, true)) {
        return [];
    }

    $stmt = $pdo->prepare(
        'SELECT column_name FROM information_schema.columns
         WHERE table_schema = \'public\' AND table_name = :t'
    );
    $stmt->execute([':t' => $table]);

    return array_map(static fn (array $row): string => (string)($row['column_name'] ?? ''), $stmt->fetchAll());
}
