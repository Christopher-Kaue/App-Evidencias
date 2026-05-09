<?php

declare(strict_types=1);

/**
 * Lista minima de tabelas esperadas em database/schema_postgres.sql.
 *
 * @return list<string>
 */
function required_schema_tables(): array
{
    return [
        'usuario',
        'perfil',
        'tipoevidencia',
        'areacurso',
        'cadastro_local',
        'sala',
        'evento',
        'eventoevidencia',
    ];
}

/**
 * @return list<string> nomes em falta (vazio = schema aplicado).
 */
function schema_missing_tables(PDO $pdo): array
{
    $missing = [];
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.tables WHERE table_schema = :sch AND table_name = :tbl LIMIT 1'
    );
    foreach (required_schema_tables() as $table) {
        $stmt->execute(['sch' => 'public', 'tbl' => $table]);
        if (!$stmt->fetchColumn()) {
            $missing[] = $table;
        }
    }

    return $missing;
}
