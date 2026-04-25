CREATE DATABASE IF NOT EXISTS app_evidencias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE app_evidencias;

CREATE TABLE IF NOT EXISTS usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  celular VARCHAR(30) NOT NULL,
  senha VARCHAR(255) NOT NULL,
  status ENUM('A', 'I') NOT NULL DEFAULT 'A',
  idusuario INT NULL,
  dtcadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS perfil (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  status ENUM('A', 'I') NOT NULL DEFAULT 'A',
  idusuario INT NOT NULL,
  dtcadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_perfil_usuario FOREIGN KEY (idusuario) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS sessao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  idusuario INT NOT NULL,
  dtcadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (idusuario) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS perfilsessao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idperfil INT NOT NULL,
  idsessao INT NOT NULL,
  CONSTRAINT fk_ps_perfil FOREIGN KEY (idperfil) REFERENCES perfil(id),
  CONSTRAINT fk_ps_sessao FOREIGN KEY (idsessao) REFERENCES sessao(id)
);

CREATE TABLE IF NOT EXISTS evento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(180) NOT NULL,
  data DATETIME NOT NULL,
  local VARCHAR(180) NOT NULL,
  sala VARCHAR(80) NOT NULL,
  qtdparticipantes INT NOT NULL,
  card TEXT,
  idusuario INT NOT NULL,
  dtcadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_usuario FOREIGN KEY (idusuario) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS publicoalvo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  idusuario INT NOT NULL,
  dtcadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_publico_usuario FOREIGN KEY (idusuario) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS eventopublicoalvo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idevento INT NOT NULL,
  idpublicoalvo INT NOT NULL,
  CONSTRAINT fk_ep_evento FOREIGN KEY (idevento) REFERENCES evento(id),
  CONSTRAINT fk_ep_publico FOREIGN KEY (idpublicoalvo) REFERENCES publicoalvo(id)
);

CREATE TABLE IF NOT EXISTS tipoevidencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  idusuario INT NOT NULL,
  dtcadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tipo_usuario FOREIGN KEY (idusuario) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS eventoevidencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idevento INT NOT NULL,
  idtipoevidencia INT NOT NULL,
  CONSTRAINT fk_ee_evento FOREIGN KEY (idevento) REFERENCES evento(id),
  CONSTRAINT fk_ee_tipo FOREIGN KEY (idtipoevidencia) REFERENCES tipoevidencia(id)
);

-- Senhas de teste abaixo: texto plano "Senha123" (bcrypt). O login web aceita apenas perfis professor/coordenador.
INSERT INTO usuario (id, nome, email, celular, senha, status, idusuario)
VALUES (1, 'Administrador Inicial', 'admin@fadergs.com.br', '51999999999', '$2b$10$hzkw5Zdd17BBPwOHfRNLO.QrhS4dCbqyOty3weo6HtqCtIb0Xguh6', 'A', NULL)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO perfil (nome, status, idusuario)
SELECT 'administrador', 'A', 1
WHERE NOT EXISTS (SELECT 1 FROM perfil WHERE nome = 'administrador' AND idusuario = 1);

INSERT INTO usuario (nome, email, celular, senha, status, idusuario)
SELECT 'Professor Teste', 'professor.teste@fadergs.com.br', '51990000001', '$2b$10$hzkw5Zdd17BBPwOHfRNLO.QrhS4dCbqyOty3weo6HtqCtIb0Xguh6', 'A', 1
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'professor.teste@fadergs.com.br');

INSERT INTO perfil (nome, status, idusuario)
SELECT 'professor', 'A', u.id
FROM usuario u
WHERE u.email = 'professor.teste@fadergs.com.br'
  AND NOT EXISTS (SELECT 1 FROM perfil p WHERE p.idusuario = u.id);

INSERT INTO usuario (nome, email, celular, senha, status, idusuario)
SELECT 'Coordenador Teste', 'coordenador.teste@fadergs.com.br', '51990000002', '$2b$10$hzkw5Zdd17BBPwOHfRNLO.QrhS4dCbqyOty3weo6HtqCtIb0Xguh6', 'A', 1
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'coordenador.teste@fadergs.com.br');

INSERT INTO perfil (nome, status, idusuario)
SELECT 'coordenador', 'A', u.id
FROM usuario u
WHERE u.email = 'coordenador.teste@fadergs.com.br'
  AND NOT EXISTS (SELECT 1 FROM perfil p WHERE p.idusuario = u.id);
