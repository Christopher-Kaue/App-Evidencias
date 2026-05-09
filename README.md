# Evidencias FADERGS

Frontend Next.js + API PHP com **PostgreSQL**.

## Desenvolvimento local

1. PostgreSQL com banco `app_evidencias` (importe `database/schema_postgres.sql`).
2. Copie `backend/.env.example` para `backend/.env` e ajuste host/porta/usuario/senha.
3. Na raiz do repositorio:
   - **Windows (evita bloqueio do `npm.ps1`):** execute `dev-local.cmd` ou `node scripts/dev-local.mjs`
   - Ou: `npm.cmd run dev:local` no PowerShell.

Frontend: URL exibida pelo Next (geralmente `http://localhost:3000`). API PHP: `http://127.0.0.1:9999`. Com proxy dev, use `/api-proxy/...` na mesma origem do Next.

## Deploy na Vercel (dois projetos)

### 1. API PHP (`backend/`)

- Novo projeto Vercel → **Root Directory:** `backend`
- **Variaveis de ambiente** (Production): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, e para Postgres na nuvem (`Neon`, `Supabase`, etc.) normalmente `DB_SSL=1`
- Em **Settings → Deployment Protection**: desative protecao padrao neste projeto (senao `/api/*.php` pode responder **403 Forbidden** para o navegador e para o proxy do frontend).
- Anote o URL de producao (ex.: `https://xxx.vercel.app`).

### 2. Frontend (`frontend/`)

- Novo projeto → **Root Directory:** `frontend`
- **Build Command:** `npm run build` (usa `scripts/build-production.mjs` dentro de `frontend/`)
- **Output Directory:** `out`
- **Variavel obrigatoria (Production):** `NEXT_PUBLIC_API_BASE_URL` = URL base do projeto PHP (**sem** barra final), ex.: `https://seu-php.vercel.app`. Isso alinha o rewrite `/api-proxy/*` no build (`scripts/sync-vercel-rewrite.mjs`).
- Opcional: `NEXT_PUBLIC_API_VIA_PROXY=0` e usar só URL direta (CORS no PHP ja permite `*`).

### Integracao GitHub

Ligue o repositorio em cada projeto Vercel e use os Root Directory acima. O codigo do frontend **precisa** dos scripts em `frontend/scripts/` no mesmo deploy (nao depende mais de `scripts/` da raiz na build da Vercel).

