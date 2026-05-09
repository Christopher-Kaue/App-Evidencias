# Evidencias FADERGS

Frontend Next.js + API PHP com **PostgreSQL**.

## Desenvolvimento local

1. PostgreSQL com banco `app_evidencias` (importe `database/schema_postgres.sql`).
2. Copie `backend/.env.example` para `backend/.env` e ajuste host/porta/usuario/senha.
3. Na raiz do repositorio:
   - **Windows (evita bloqueio do `npm.ps1`):** execute `dev-local.cmd` ou `node scripts/dev-local.mjs`
   - Ou: `npm.cmd run dev:local` no PowerShell.

Frontend: URL exibida pelo Next (geralmente `http://localhost:3000`). API PHP: `http://127.0.0.1:9999`. Com proxy dev, use `/api-proxy/...` na mesma origem do Next.

## Deploy

- Frontend e PHP podem ir para Vercel (variaveis `NEXT_PUBLIC_*` e projeto PHP separado). Veja `frontend/.env.example` e `frontend/vercel.json`.
