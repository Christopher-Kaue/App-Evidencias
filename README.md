# App Evidencias - FADERGS

Sistema profissional de gestao de eventos academicos com backend em PHP + MySQL e frontend em Next.js, pronto para deploy na Vercel.

## Arquitetura

- `api/`: endpoints PHP serverless (`@vercel/php`)
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
2. Inicie `Apache` e `MySQL` no painel do XAMPP.
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

1. Suba o projeto no GitHub.
2. Importe o repositorio na Vercel.
3. Configure variaveis de ambiente do banco MySQL.
4. Build Command (automatico): `npm run build` em `web`.
5. A Vercel publicara:
   - Frontend Next.js em `/`
   - API PHP em `/api/*.php`

## Endpoints principais

- `POST /api/login.php`
- `GET,POST /api/users.php`
- `GET,POST /api/events.php`
- `GET,POST /api/evidences.php`
- `POST /api/whatsapp.php`
- `GET /api/reports.php` (header `X-Role: administrador`)
