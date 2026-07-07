# Guia de Lançamento — Atende AI

Passo a passo pra colocar o Atende AI no ar e atender o primeiro cliente real.
Siga na ordem. Cada fase tem: **o que fazer**, **onde**, e **por quê**.

> Legenda de urgência:
> 🔴 obrigatório pra subir · 🟡 obrigatório pra funcionar de verdade · 🟢 pode deixar pra depois

---

## Visão geral: onde cada coisa vive

| Peça | Onde hospeda | Papel |
|---|---|---|
| A aplicação (site + painel + API) | **Vercel** | O software em si |
| Banco de dados | **Neon** (Postgres gerenciado) | Guarda clientes, conversas, agendamentos |
| Código-fonte | **GitHub** | De onde a Vercel puxa e faz deploy |
| Cérebro da IA | **Anthropic (Claude)** | Gera as respostas |
| Transcrição de áudio | **OpenAI (Whisper)** | Entende áudios do WhatsApp |
| WhatsApp | **360dialog** (BSP) | Envia/recebe as mensagens |
| Agenda | **Google Cloud** (OAuth) | Integra Google Calendar |
| Domínio | **Registro.br** ou similar | seudominio.com.br |

Fluxo: você escreve código → sobe no **GitHub** → **Vercel** faz deploy automático →
app usa **Neon** (banco), **Anthropic** (IA) e **360dialog** (WhatsApp).

---

## FASE 0 — Preparar o código 🔴

### 0.1 Tirar o projeto do OneDrive
O projeto está em `OneDrive\Documentos\atende-ai`. O OneDrive sincroniza
`node_modules`/`.next` e corrompe build. **Mova pra fora**, ex: `C:\dev\atende-ai`.

Depois de mover, reinstale as dependências:
```
npm install
```

### 0.2 Criar conta e repositório no GitHub
- Crie conta em **github.com** (grátis).
- Crie um repositório **privado** chamado `atende-ai`.
- Conecte o projeto local ao GitHub:
```
git remote add origin https://github.com/SEU_USUARIO/atende-ai.git
git branch -M main
git push -u origin main
```
> Você não tem o GitHub CLI (`gh`) instalado — crie o repo pelo site mesmo.

**Por quê:** a Vercel faz deploy a partir do GitHub. Sem isso, não sobe.

---

## FASE 1 — Contas que você precisa criar

Crie todas antes de começar o deploy. Guarde logins num gerenciador de senhas.

| # | Conta | Site | Custo inicial | Urgência |
|---|---|---|---|---|
| 1 | GitHub | github.com | Grátis | 🔴 |
| 2 | Vercel | vercel.com | Grátis (Hobby) → Pro US$20/mês | 🔴 |
| 3 | Neon (Postgres) | neon.tech | Grátis → ~US$19/mês | 🔴 |
| 4 | Anthropic | console.anthropic.com | Pré-pago por uso | 🟡 |
| 5 | OpenAI | platform.openai.com | Pré-pago por uso | 🟢 |
| 6 | Google Cloud | console.cloud.google.com | Grátis | 🟡 |
| 7 | 360dialog | hub.360dialog.com | ~€49/mês + msgs | 🟡 |
| 8 | Domínio | registro.br | ~R$40/ano | 🟡 |

---

## FASE 2 — Banco de dados (Neon) 🔴

1. Entre em **neon.tech**, crie um projeto (região mais perto: **AWS São Paulo** se disponível, senão US East).
2. Copie a **connection string** (começa com `postgresql://...`).
3. Use a versão **"Pooled connection"** (com `-pooler` no host) — é ela que aguenta muitas conversas ao mesmo tempo.

Essa string vai virar a variável `DATABASE_URL` na Vercel (Fase 4).

**Por quê Neon:** Postgres gerenciado, com pooler de conexão embutido (essencial pra
escalar, como conversamos), backup automático, e tem plano grátis pra começar.
Alternativa equivalente: **Supabase**.

---

## FASE 3 — Deploy na Vercel 🔴

1. Entre em **vercel.com**, faça login **com o GitHub**.
2. **Add New → Project** → selecione o repositório `atende-ai`.
3. A Vercel detecta Next.js sozinho. **Não clique em Deploy ainda** — primeiro configure
   as variáveis de ambiente (Fase 4).
4. O `vercel.json` do projeto já configura o **cron** que roda as automações de hora em hora — não precisa fazer nada.

**Por quê Vercel:** é a casa do Next.js, deploy automático a cada push, HTTPS grátis,
escala sozinho, e já suporta o cron das automações.

---

## FASE 4 — Variáveis de ambiente na Vercel 🔴🟡

Em **Project → Settings → Environment Variables**, adicione cada uma.
A referência completa está no arquivo `.env.example` do projeto.

### Obrigatórias pra subir 🔴
| Variável | Valor | De onde vem |
|---|---|---|
| `DATABASE_URL` | `postgresql://...-pooler...` | Neon (Fase 2) |
| `AUTH_SECRET` | rode `openssl rand -hex 32` | gere você mesmo |
| `APP_URL` | `https://app.seudominio.com.br` | seu domínio (Fase 5) |

### Pra IA funcionar 🟡
| Variável | Valor | De onde vem |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | console.anthropic.com |
| `OPENAI_API_KEY` | `sk-...` (áudio) | platform.openai.com |

### WhatsApp 🟡
| Variável | Valor |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | invente um texto secreto |
| `WHATSAPP_APP_SECRET` | (Meta) segurança do webhook |
| `D360_PARTNER_ID` | do painel 360dialog |
| `D360_PARTNER_API_TOKEN` | do painel 360dialog |

### Google Calendar 🟡
| Variável | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud (Fase 6) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud (Fase 6) |

### Automações 🟡
| Variável | Valor |
|---|---|
| `CRON_SECRET` | rode `openssl rand -hex 32` |

Depois de preencher as obrigatórias, clique **Deploy**. O build roda as migrações do
banco automaticamente (`prisma migrate deploy`) e sobe o app.

> **Primeiro deploy:** rode o seed uma vez pra criar sua conta de admin, OU registre-se
> pela tela `/registrar` do app já no ar.

---

## FASE 5 — Domínio 🟡

1. Registre um domínio no **registro.br** (ex: `atendeai.com.br`).
2. Na Vercel: **Settings → Domains → Add** → digite o domínio.
3. A Vercel te dá os registros DNS pra apontar no registro.br.
4. Atualize a variável `APP_URL` pro domínio final.

**Por quê:** os clientes acessam por aqui, e os webhooks/OAuth precisam de URL fixa.
Dá pra lançar sem domínio (usando o `.vercel.app`), mas o profissional é ter o seu.

---

## FASE 6 — Conectar as integrações (setup único da plataforma)

Isso você faz **uma vez**. Depois, cada cliente só clica "Conectar" no painel.

### 6.1 Anthropic (Claude) 🟡
1. **console.anthropic.com** → API Keys → crie uma chave.
2. Adicione crédito (Billing). Comece com ~US$20-50.
3. Cole em `ANTHROPIC_API_KEY` na Vercel.

### 6.2 Google Calendar 🟡
1. **console.cloud.google.com** → novo projeto.
2. **APIs & Services → Enable APIs** → ative **Google Calendar API**.
3. **Credentials → Create OAuth Client ID** → tipo "Web application".
4. Em **Authorized redirect URIs**, adicione:
   `https://SEU_DOMINIO/api/integrations/google/callback`
5. Copie Client ID e Secret → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. Publique a tela de consentimento OAuth.

### 6.3 WhatsApp via 360dialog 🟡 (item de maior prazo — comece cedo)
1. Crie conta **Partner** em **hub.360dialog.com**.
2. Pegue `Partner ID` e `API Token` → `D360_PARTNER_ID` / `D360_PARTNER_API_TOKEN`.
3. No painel do cliente, o botão "Conectar WhatsApp" abre o fluxo de 1 clique do 360dialog.

> **Atenção ao prazo:** aprovação de número WhatsApp Business + templates de mensagem
> leva alguns dias e passa pela Meta. Não deixe pra última hora.

---

## FASE 7 — Ligar o webhook do WhatsApp 🟡

Pra IA receber as mensagens, o WhatsApp precisa saber pra onde mandar:

- **URL do webhook:** `https://SEU_DOMINIO/api/whatsapp/webhook`
- **Verify token:** o mesmo valor que você pôs em `WHATSAPP_VERIFY_TOKEN`.

No 360dialog isso é configurado no onboarding. Se usar Meta direto, é no painel da Meta.
A rota já valida a assinatura de segurança quando `WHATSAPP_APP_SECRET` está definido.

---

## FASE 8 — Checklist de "está no ar de verdade" ✅

- [ ] `https://SEU_DOMINIO/api/health` responde `{"status":"ok","db":"up"}`
- [ ] Consigo criar conta e logar
- [ ] Criei um negócio e cadastrei serviços/preços
- [ ] Mandei uma mensagem de teste no WhatsApp conectado e a IA respondeu
- [ ] A IA agendou um horário e apareceu na Agenda + no Google Calendar
- [ ] As automações aparecem na aba Automações
- [ ] Tema claro/escuro funcionando

---

## Custos mensais estimados (começando pequeno)

| Item | Custo/mês |
|---|---|
| Vercel | Grátis (Hobby) ou US$20 (Pro) |
| Neon | Grátis → ~US$19 |
| Anthropic | por uso (varia com nº de conversas e plano do cliente) |
| OpenAI (áudio) | por uso (baixo) |
| 360dialog | ~€49 + custo por conversa |
| Domínio | ~R$40/ano |
| **Base fixa** | **~US$40–90/mês** pra começar |

Lembre: o modelo da IA escala com o plano do cliente (Essencial=Haiku barato,
Ilimitado=Opus), então o custo de IA sobe junto com o que você cobra. Margem protegida.

---

## O que AINDA NÃO está pronto (decidir antes/depois de lançar)

| Item | Situação | Recomendação |
|---|---|---|
| **Cobrança automática (Stripe)** | 🔴 Não construído | Pra começar, cobre manual (Pix/boleto). Depois integro Stripe. |
| **Templates de WhatsApp** (msg fora da janela de 24h) | Pendente | Necessário pras automações proativas funcionarem 100%. |
| **Onboarding guiado** do novo cliente | Pendente | Melhora conversão, mas dá pra lançar sem. |
| **URLs por slug** (o bug de sessão/404) | Pendente | Resolver logo — atrapalha no dia a dia. |

---

## Ordem recomendada pra você executar

1. **Hoje:** Fase 0 (tirar do OneDrive + GitHub) e Fase 1 (criar contas).
2. **Comece já o 360dialog/WhatsApp** (Fase 6.3) — é o que demora mais na aprovação.
3. Fase 2 (Neon) → Fase 3+4 (Vercel + envs) → app no ar num `.vercel.app`.
4. Fase 5 (domínio) e Fase 6 (Anthropic + Google).
5. Fase 7 (webhook) → Fase 8 (checklist) → **primeiro cliente**.
