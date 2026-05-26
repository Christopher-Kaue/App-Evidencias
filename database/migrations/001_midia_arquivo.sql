-- Aplicar em bases ja existentes (Neon/producao): psql $DATABASE_URL -f database/migrations/001_midia_arquivo.sql
CREATE TABLE IF NOT EXISTS midia_arquivo (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    conteudo BYTEA NOT NULL,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
