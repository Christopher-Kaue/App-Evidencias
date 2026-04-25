# App Evidencias - FADERGS

Sistema profissional de gestao de eventos academicos com backend em PHP + MySQL e frontend em Next.js, pronto para deploy na Vercel.

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

## Como rodar local (XAMPP)

1. Copie o projeto para a pasta `htdocs` do XAMPP com o nome `app-evidencias`.
2. Inicie `Apache` e `MySQL` no painel do XAMPP. Confirme que `mod_rewrite` esta habilitado e que o virtual host permite `.htaccess` (`AllowOverride All`).
3. Crie um banco MySQL e execute:
   - `database/schema.sql`
4. Na pasta `api`, copie `api/.env.example` para `api/.env` e ajuste:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASS`
5. Instale dependencias do frontend:
   - `cd web`
   - `npm install`
   - crie o arquivo `.env.local` com:
     - `NEXT_PUBLIC_API_BASE_URL=http://localhost/app-evidencias`
6. Rode a interface:
   - `npm run dev`
7. A API PHP sera servida automaticamente pelo Apache em:
   - `http://localhost/app-evidencias/api/*.php`

## Deploy na Vercel

Use **dois projetos** (recomendado): um para o PHP e outro para o Next.js.

**API (PHP)**

1. Crie um projeto importando o mesmo repositorio.
2. Em **Settings > General > Root Directory**, defina exatamente `api` (pasta do PHP no repo). Confirme no painel que nao ficou vazio: se estiver na raiz do monorepo, as rotas `/api/*.php` devolvem **404** na Vercel.
3. **Framework Preset**: Other (sem build command; o `vercel.json` define o runtime `vercel-php`).
4. Em **Environment Variables**, cadastre `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` (o MySQL precisa aceitar conexoes da internet, por exemplo Aiven, PlanetScale ou VPS com firewall liberado para a Vercel). Opcional: `PUBLIC_APP_URL` com a URL publica do proprio projeto PHP (ex.: `https://seu-api.vercel.app`) para links de upload corretos.
5. As URLs ficam em `https://<seu-projeto-api>.vercel.app/api/*.php`.
6. **Deployment Protection (obrigatorio se login/rewrite falhar com 403)**: no painel do **projeto PHP**, abra **Settings → Deployment Protection**. Desative *Standard Protection* nos ambientes em que a API deva ser publica, ou use **Protection Bypass for Automation** (conforme a [documentacao Vercel](https://vercel.com/docs/deployments/deployment-protection)). Com a protecao ativa, pedidos vindos do browser (CORS direto) ou rewrites a partir do projeto Next podem receber **403** na borda (`X-Vercel-Mitigated: deny`) e o front mostra erro de rede. **Isto so se altera no painel** — nao existe equivalente no `vercel.json` do PHP.

**Web (Next.js)**

1. Crie outro projeto no mesmo repositorio.
2. Em **Settings > General > Root Directory**, defina **`web`** (obrigatorio). Nao use a raiz do repositorio para o frontend: copiar `web/.next` para a raiz quebra os caminhos das Lambdas (erros como `_global-error` / segmentos `.rsc`).
3. **Framework Preset**: Next.js (ou deixe autodetect; existe `web/vercel.json` com `"framework": "nextjs"`).
4. **Build Command** padrao `next build` (ja inclui copia `out` -> `public` na Vercel). Se o painel exigir **Output Directory** = `public`, deixe assim: na Vercel o app usa `output: "export"` e o script preenche `public/` automaticamente.
5. **URL da API no frontend**:
   - **Rewrite (padrao no repo)**: em `web/vercel.json`, o `destination` do rewrite **deve** ser o mesmo URL base do projeto PHP que abre no browser (alias de producao, **sem** barra final), no formato `https://<seu-php>.vercel.app/api/:path*` — neste repositorio: `https://api-christopher-kaues-projects.vercel.app/api/:path*`. Se mudar o nome do projeto PHP na Vercel, atualize esse `destination` e o valor `DEFAULT_VERCEL_PHP_API` em `web/next.config.ts`.
   - **Modo proxy (recomendado na Vercel)**: nao defina `NEXT_PUBLIC_API_VIA_PROXY` no painel (ou remova). No build com `VERCEL=1`, o `next.config.ts` define `NEXT_PUBLIC_API_VIA_PROXY=1` e o browser chama `/<origem>/api-proxy/...` (mesma origem, sem CORS ao PHP).
   - **Modo direto ao PHP** (CORS cross-origin): no painel do projeto Next, defina `NEXT_PUBLIC_API_VIA_PROXY=0` e `NEXT_PUBLIC_API_BASE_URL=https://<seu-php>.vercel.app` (sem barra final, **sem** sufixo `/api`). Exige que o projeto PHP permita origem do front (CORS ja esta no PHP) e que **Deployment Protection** esteja desativado no PHP (passo 6 acima).
   - **Fora da Vercel** (local): `http://localhost/app-evidencias` por padrao; sobrescreva com `NEXT_PUBLIC_API_BASE_URL` em `web/.env.local`.

### Login de teste (apos rodar `database/schema.sql` ou `database/migrate_senhas_teste_Senha123.sql`)

| Email | Senha | Observacao |
| --- | --- | --- |
| `professor.teste@fadergs.com.br` | `Senha123` | Acesso ao sistema |
| `coordenador.teste@fadergs.com.br` | `Senha123` | Acesso ao sistema |
| `admin@fadergs.com.br` | `Senha123` | Perfil administrador **nao** entra neste app (use professor ou coordenador) |

Se a API retornar erro de banco na nuvem, na Vercel do **PHP** defina `DB_SSL=1` (e opcionalmente `DB_SSL_CA`) conforme `api/.env.example`.

Para desenvolver a partir da raiz do repo, continue usando `npm run dev` / `npm run build` no `package.json` da raiz (delega para `web/`).

O aviso sobre `builds` no painel some ao usar apenas `functions` no `api/vercel.json`, como neste repositorio.

## Endpoints principais

- `POST /api/login.php`
- `GET,POST /api/users.php`
- `GET,POST /api/events.php`
- `GET,POST /api/evidences.php`
- `POST /api/whatsapp.php`
- `GET /api/reports.php` (header `X-Role: administrador`)
