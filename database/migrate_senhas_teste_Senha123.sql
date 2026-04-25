-- Aplica se o banco ja existia com hashes antigos. Senha em texto: Senha123
UPDATE usuario
SET senha = '$2b$10$hzkw5Zdd17BBPwOHfRNLO.QrhS4dCbqyOty3weo6HtqCtIb0Xguh6'
WHERE email IN (
  'admin@fadergs.com.br',
  'professor.teste@fadergs.com.br',
  'coordenador.teste@fadergs.com.br'
);
