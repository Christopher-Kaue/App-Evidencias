<?php

require_once __DIR__ . '/../api/_lib/db.php';

$pdo = db();

$queries = [
    "ALTER TABLE evento MODIFY card TEXT NULL",
    "INSERT INTO usuario (nome, email, celular, senha, status, idusuario)
     SELECT 'Professor Teste', 'professor.teste@fadergs.com.br', '51990000001', '\$2y\$10\$NjzdrGgwu/HdhgsdVJ4AyuJo1xsQwz9GgfXkbL4FjmEA3wxfJfS2C', 'A', 1
     WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'professor.teste@fadergs.com.br')",
    "INSERT INTO usuario (nome, email, celular, senha, status, idusuario)
     SELECT 'Coordenador Teste', 'coordenador.teste@fadergs.com.br', '51990000002', '\$2y\$10\$vCgtf5WJ7tNFPzxZ4tgGROEB8aLzvRXJLltOD12mDxfLApx2g/jw6', 'A', 1
     WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'coordenador.teste@fadergs.com.br')",
    "INSERT INTO perfil (nome, status, idusuario)
     SELECT 'professor', 'A', u.id
     FROM usuario u
     WHERE u.email = 'professor.teste@fadergs.com.br'
       AND NOT EXISTS (SELECT 1 FROM perfil p WHERE p.idusuario = u.id)",
    "INSERT INTO perfil (nome, status, idusuario)
     SELECT 'coordenador', 'A', u.id
     FROM usuario u
     WHERE u.email = 'coordenador.teste@fadergs.com.br'
       AND NOT EXISTS (SELECT 1 FROM perfil p WHERE p.idusuario = u.id)"
];

foreach ($queries as $query) {
    $pdo->exec($query);
}

echo "Seed concluido com sucesso.\n";
