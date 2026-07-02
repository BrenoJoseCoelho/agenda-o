# Atende AI

Atendente de IA para WhatsApp de pequenos negocios: responde duvidas, tira precos e agenda
horarios sozinha, 24h. Multi-tenant desde o inicio: uma organizacao pode ser um `DONO`
(um unico negocio) ou uma `AGENCIA` revendendo para varios clientes (cada um sua sub-conta,
seu Cerebro, sua fatura).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (Auth.js) v5, credentials + JWT sessions
- Anthropic (Claude) para a IA, com fallback heuristico offline quando `ANTHROPIC_API_KEY` nao esta configurada
- WhatsApp Cloud API (Meta) para o numero real, via `/api/whatsapp/webhook`

## Rodando localmente

1. Suba um Postgres (ex: `docker run -d -e POSTGRES_USER=atende -e POSTGRES_PASSWORD=... -e POSTGRES_DB=atende_ai -p 55432:5432 postgres:16`)
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `AUTH_SECRET`
3. `npm install`
4. `npx prisma migrate dev`
5. `npx tsx prisma/seed.ts` (cria contas demo: `demo@barbearia.com` / `demo@agencia.com`, senha `demo1234`)
6. `npm run dev`

## Estrutura

- `/registrar`, `/login` — onboarding (escolhe DONO ou AGENCIA no cadastro)
- `/organizacao` — lista de negocios da conta (para agencia: todos os clientes + billing)
- `/negocios/[businessId]/painel` — metricas (conversas, agendamentos, leads, % fora do horario)
- `/negocios/[businessId]/conversas` — chat ao vivo estilo WhatsApp para testar a IA
- `/negocios/[businessId]/cerebro` — configuracao da IA (tom, horarios, regras, servicos/precos, integracao WhatsApp)
- `/api/whatsapp/webhook` — webhook do WhatsApp Cloud API (verificacao GET + mensagens POST)

Sem `ANTHROPIC_API_KEY`, a aba Conversas usa um motor de respostas heuristico simples (ver
`src/lib/ai.ts`) so para permitir testar o produto sem credenciais. Configure a chave para a
IA de verdade entrar em acao automaticamente.
