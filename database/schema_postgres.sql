-- PostgreSQL 14+ — App Evidencias
-- Criar DB: CREATE DATABASE app_evidencias ENCODING 'UTF8';
-- Importar: psql -U postgres -d app_evidencias -f database/schema_postgres.sql
-- Vercel/Neon: New Project > SQL Editor > colar este ficheiro inteiro > Run (depois copie DATABASE_URL para o projeto PHP).
-- Docker local (volume ja inicializado): npm run docker:schema

CREATE TABLE IF NOT EXISTS usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    celular VARCHAR(50) NOT NULL DEFAULT '',
    senha VARCHAR(255) NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    idusuario INT NULL,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuario_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS perfil (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    idusuario INT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_perfil_usuario ON perfil (idusuario);

CREATE TABLE IF NOT EXISTS tipoevidencia (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL UNIQUE
);

INSERT INTO tipoevidencia (nome)
VALUES ('Lista de presenca'), ('Foto do evento'), ('Material didatico')
ON CONFLICT (nome) DO NOTHING;

CREATE TABLE IF NOT EXISTS areacurso (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(180) NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    idusuario INT NULL,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_areacurso_nome UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS cadastro_local (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(180) NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    idusuario INT NULL,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_cadastro_local_nome UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS sala (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    idusuario INT NULL,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_sala_nome UNIQUE (nome)
);

-- Coluna "local" entre aspas por ser palavra reservada no PostgreSQL.
CREATE TABLE IF NOT EXISTS evento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data TIMESTAMP NOT NULL,
    "local" VARCHAR(255) NOT NULL DEFAULT '',
    sala VARCHAR(120) NOT NULL DEFAULT '',
    qtdparticipantes INT NOT NULL DEFAULT 0,
    card TEXT NULL,
    idusuario INT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    idareacurso INT NULL REFERENCES areacurso (id) ON DELETE SET NULL,
    publicoalvo VARCHAR(255) NULL,
    cargahoraria DECIMAL(6, 2) NULL,
    qtdprofessores INT NOT NULL DEFAULT 0,
    dtcadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_evento_usuario ON evento (idusuario);
CREATE INDEX IF NOT EXISTS ix_evento_data ON evento (data);

CREATE TABLE IF NOT EXISTS eventoevidencia (
    id SERIAL PRIMARY KEY,
    idevento INT NOT NULL REFERENCES evento (id) ON DELETE CASCADE,
    idtipoevidencia INT NOT NULL REFERENCES tipoevidencia (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_eventoevidencia_evento ON eventoevidencia (idevento);
