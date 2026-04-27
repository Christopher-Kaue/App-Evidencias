# App Evidencias - FADERGS

Sistema profissional de gestao de eventos academicos com backend em PHP + MySQL e frontend em Next.js, pronto para deploy na Vercel.

**Guia passo-a-passo para subir na Vercel (copiar variáveis, ordem dos projectos):** ver **`DEPLOY_VERCEL.txt`** na raiz do repo.

## Arquitetura

- `api/`: projeto PHP na Vercel (Root Directory `api`). Os handlers ficam em `api/api/*.php` para obedecer a convencao de rotas `/api/*.php` da plataforma; no XAMPP, `api/.htaccess` encaminha `api/login.php` para esses arquivos.
- `web/`: aplicacao Next.js (interface profissional)
- `database/schema.sql`: modelagem do banco de dados conforme briefing

## Requisitos atendidos

- Cadastro e gestao de usuarios, perfis e eventos
- Validacao de conflito de horario/local/sala ao criar evento
- Registro de evidencias por evento
- Controle de acesso por perfil (exemplo: relatorios somente admin)
- Endpoint para notificacao WhatsApp (pronto para integrar provedor oficial)
- Relatorios gerenciais com indicadores

## Como rodar local (recomendado: PHP embutido + MySQL)

1. Inicie o **MySQL** (XAMPP ou outro) e crie o banco executando `database/schema.sql`.
2. Na raiz do repositorio: `npm install` (raiz e `web/`; o `package.json` da raiz delega o build ao `web/`).
3. Suba **Next + API PHP** juntos (o script cria `api/.env` a partir de `api/.env.example` se ainda nao existir; ajuste credenciais do banco em `api/.env`):
   - `npm run dev:local`
4. Acesse o front em `http://localhost:3000` e a API em `http://127.0.0.1:9999/api/*.php` (porta 9999; config em `web/.env.development`).
5. Login de teste: `professor.teste@fadergs.com.br` / `Senha123` (ou coordenador; nao use o usuario admin nesta interface).

**So o Next (API ja em outro terminal):** `npm run dev`  
**So a API PHP:** `npm run dev:api`

## Opcional: XAMPP (Apache + MySQL)

1. Copie o projeto para `htdocs/app-evidencias`, inicie **Apache** e **MySQL**, com `mod_rewrite` e `AllowOverride All`.
2. Execute `database/schema.sql` e configure `api/.env`.
3. Crie `web/.env.local` com `NEXT_PUBLIC_API_BASE_URL=http://localhost/app-evidencias` (sobrescreve o padrao da porta 9999).
4. `npm run dev` na raiz. A API fica em `http://localhost/app-evidencias/api/*.php`.

## Deploy na Vercel (login e banco)

A Vercel **nao hospeda MySQL**. E preciso um MySQL na internet (Railway, Aiven, Clever Cloud, RDS, etc.) com o schema importado. Dois projetos no mesmo repo: **API PHP** e **Web Next**.

**Ordem recomendada (ligar o site ao banco sem erro de login):** (1) Criar MySQL na nuvem e importar `database/schema_cloud.sql`. (2) Criar projeto Vercel com **Root Directory** `api`, colocar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` e `DB_SSL=1` se precisar; `GET .../api/health.php` deve mostrar `db: true`. (3) Criar projeto Vercel com **Root Directory** `web` e `NEXT_PUBLIC_API_BASE_URL=https://<mesma-url-do-passo-2>.vercel.app` (sem `/api`). (4) Redeploy do **web** apos salvar a variavel. (5) Entrar com `professor.teste@fadergs.com.br` / `Senha123` (nao use `admin@` nesta interface). (6) Desative **Deployment Protection** no projeto **PHP** se houver 403.

### 1) MySQL na nuvem

1. Crie um servico MySQL e anote host, porta, usuario, senha e nome do banco.
2. Abra o **SQL console** do provedor, selecione o banco e execute o arquivo `database/schema_cloud.sql` (ou `schema.sql` se tiver permissao para criar banco localmente).
3. No painel do MySQL, libere acesso vindo da internet (firewall / IP allowlist). Em testes, “allow all” ou 0.0.0.0/0 costuma resolver; em producao restrinja.
4. Se o provedor exigir TLS, use `DB_SSL=1` no projeto PHP (ver `api/.env.example`).

### 2) Projeto API (PHP)

1. Importe o repositorio e defina **Root Directory** = `api` (obrigatorio; senao `/api/*.php` vira 404).
2. **Framework**: Other. Sem build command; `api/vercel.json` usa runtime `vercel-php`.
3. **Environment Variables**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` e, se necessario, `DB_SSL=1` (e `DB_SSL_CA` se o provedor passar certificado). Opcional: `PUBLIC_APP_URL=https://<sua-api>.vercel.app` para upload.
4. Deploy. A URL fica `https://<projeto-php>.vercel.app/api/*.php`.
5. **Deployment Protection**: em **Settings > Deployment Protection** do projeto **PHP**, desative a protecao publica ou use bypass, senao o front recebe **403** na borda ao falar com a API (ver [documentacao](https://vercel.com/docs/deployments/deployment-protection)).
6. **Teste o banco**: no browser ou com `curl`, chame `GET https://<sua-api>.vercel.app/api/health.php` — deve responder `ok: true` e `db: true`. Se `db: false`, corrija as variaveis de base de dados ou SSL.

### 3) Projeto Web (Next.js)

1. Novo projeto, **Root Directory** = `web` (obrigatorio).
2. **Build** (default `npm run build` ou o que apontar para `web`): o script `sync-vercel-rewrite` roda na Vercel e exige variavel abaixo; sem ela o build falha com mensagem clara.
3. **Environment Variables (obrigatorio)**: `NEXT_PUBLIC_API_BASE_URL=https://<seu-projeto-php>.vercel.app` (mesma base publica do passo 2, **sem** `/api`, **sem** barra no fim). O build reescreve `web/vercel.json` para encaminhar `/api-proxy/*` para essa API. Alternativas aceites: `NEXT_PUBLIC_VERCEL_PHP_ORIGIN` ou `VERCEL_PHP_ORIGIN` com o mesmo valor.
4. Opcional — chamar o PHP direto no browser (CORS): `NEXT_PUBLIC_API_VIA_PROXY=0` e a mesma `NEXT_PUBLIC_API_BASE_URL` (proteja a API conforme passo 2.5).
5. Se o painel exigir **Output Directory** = `public`, deixe: com `VERCEL=1` o Next gera export e o script copia para `public/`.

**Fora da Vercel** o arquivo `web/vercel.json` mantem placeholder de rewrite; localmente use `web/.env.local` para apontar a API, como antes.

### Scripts locais (apos obter credenciais do MySQL na nuvem)

- `.\scripts\import-schema-cloud.ps1` — importa `database/schema_cloud.sql` pelo cliente `mysql` (PATH ou XAMPP). Opcional `-UseSsl` se o servidor exigir TLS.
- `.\scripts\test-api-health.ps1 -PhpBaseUrl https://<teu-php>.vercel.app` — verifica `GET /api/health.php`.
- Lista de variaveis para copiar ao painel da Vercel: `scripts/vercel-env-vars-reference.txt`.

Estas configuracoes na **Vercel** e no **painel do MySQL** tem de ser feitas por ti no browser (credenciais e URLs sao teus).

### Login de teste (apos `database/schema.sql` local, `database/schema_cloud.sql` na nuvem, ou `database/migrate_senhas_teste_Senha123.sql`)

| Email | Senha | Observacao |
| --- | --- | --- |
| `professor.teste@fadergs.com.br` | `Senha123` | Acesso ao sistema |
| `coordenador.teste@fadergs.com.br` | `Senha123` | Acesso ao sistema |
| `admin@fadergs.com.br` | `Senha123` | Perfil administrador **nao** entra neste app (use professor ou coordenador) |

Se a API retornar erro de banco na nuvem, na Vercel do **PHP** defina `DB_SSL=1` (e opcionalmente `DB_SSL_CA`) conforme `api/.env.example`.

Para desenvolver a partir da raiz do repo, continue usando `npm run dev` / `npm run build` no `package.json` da raiz (delega para `web/`).

O aviso sobre `builds` no painel some ao usar apenas `functions` no `api/vercel.json`, como neste repositorio.

## Endpoints principais

- `GET /api/health.php` (verifica conexao MySQL; 200 com `ok` e `db` se tudo certo)
- `POST /api/login.php`
- `GET,POST /api/users.php`
- `GET,POST /api/events.php`
- `GET,POST /api/evidences.php`
- `POST /api/whatsapp.php`
- `GET /api/reports.php` (header `X-Role: administrador`)
