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
2. Em **Settings > General > Root Directory**, defina `api`.
3. **Framework Preset**: Other (sem build command; o `vercel.json` define o runtime `vercel-php`).
4. Em **Environment Variables**, cadastre `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` (o MySQL precisa aceitar conexoes da internet, por exemplo Aiven, PlanetScale ou VPS com firewall liberado para a Vercel).
5. As URLs ficam em `https://<seu-projeto-api>.vercel.app/api/*.php`.

**Web (Next.js)**

1. Crie outro projeto no mesmo repositorio com Root Directory **`.`** (raiz do repo). O `vercel.json` na raiz define **framework: nextjs**; o `npm run build` compila `web/` e copia `web/.next` para `.next` na raiz para o deploy.
2. No painel, em Build and Development: se **Output Directory** estiver como `public`, limpe ou use o padrao do Next (o preset nextjs nao deve usar `public` como saida).
3. Em `.env.local` / envs de producao: `NEXT_PUBLIC_API_BASE_URL=https://<seu-projeto-api>.vercel.app` (sem barra no final).

Alternativa: Root Directory `web` (sem depender do `vercel.json` da raiz nem do script de copia).

O aviso sobre `builds` no painel some ao usar apenas `functions` no `api/vercel.json`, como neste repositorio.

## Endpoints principais

- `POST /api/login.php`
- `GET,POST /api/users.php`
- `GET,POST /api/events.php`
- `GET,POST /api/evidences.php`
- `POST /api/whatsapp.php`
- `GET /api/reports.php` (header `X-Role: administrador`)
