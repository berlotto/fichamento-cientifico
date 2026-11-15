# Fichamento científico

Plataforma para fichar artigos científicos com LLM: sobe PDFs, extrai dados com **citação literal e página**, verifica automaticamente e por humano, e gera a matriz de síntese e as citações ABNT.

- Arquitetura: [`arquitetura-fichamento.md`](arquitetura-fichamento.md)
- Plano e andamento: [`plano-implementacao.md`](plano-implementacao.md)

Stack: Next.js 16 (App Router, Cache Components) na Vercel; Supabase (Postgres + RLS, Storage, pgmq, pg_cron, pg_net); AI SDK + Vercel AI Gateway (a partir da F1).

## Rodando localmente

Requisitos: Node 22+, Docker Desktop.

```bash
npm install
npx supabase start          # sobe Postgres, Auth, Storage e aplica supabase/migrations
cp .env.example .env.local  # preencha com os valores impressos pelo comando acima
npm run dev
```

### Pipeline local (cron → worker)

O `pg_cron` chama `/api/worker` a cada minuto, lendo URL e segredo do Vault. Sem esses segredos o tick não faz nada. Para ligar localmente (o banco roda no Docker, por isso `host.docker.internal`):

```bash
docker exec -i supabase_db_fichamento psql -U postgres <<'SQL'
select vault.create_secret('http://host.docker.internal:3000/api/worker', 'worker_url');
select vault.create_secret('<WORKER_SECRET do .env.local>', 'worker_secret');
SQL
```

Ou chame o worker na mão:

```bash
curl -X POST http://localhost:3000/api/worker -H "Authorization: Bearer $WORKER_SECRET"
```

## Testes

```bash
npm test          # unitários (verify, printed-page, parse, worker)
npm run test:int  # integração contra o Supabase local: RLS, fila, parse
npm run typecheck
npm run lint
```

## Estrutura

```
app/(auth)/login                 login, cadastro e "Esqueci minha senha"
app/(auth)/redefinir-senha       senha nova depois do link de recuperação
app/auth/confirm/route.ts        links dos e-mails do Auth (token_hash ou code)
app/(app)/projects/...           projetos, upload, visualizador
app/api/worker/route.ts          worker do pipeline (Bearer WORKER_SECRET)
proxy.ts                         renova sessão Supabase (antigo middleware)
lib/supabase/{server,client,admin,proxy,verify-password}.ts
lib/pipeline/{worker,parse,printed-page,verify,supabase-deps}.ts
components/turnstile.tsx         widget do CAPTCHA (Cloudflare Turnstile)
supabase/migrations/*.sql
supabase/templates/              templates de e-mail do Auth
tests/integration/               testes contra o Supabase local
```

## Produção

Nenhum segredo fica neste arquivo: só nomes de variáveis e onde cada valor está guardado.

### Serviços usados

| Serviço | Para quê | Onde configurar |
|---|---|---|
| **Vercel** | Hospeda o app (deploy automático a cada push na `main`) e o AI Gateway dos modelos | vercel.com → projeto `fichamento-cientifico` |
| **Supabase** | Postgres com RLS, Auth, Storage dos PDFs, fila (pgmq) e agendador (pg_cron) | supabase.com → projeto "Fichamento Cientifico" (ref `qsfcfpntrgmwoqolqaqv`) |
| **Resend** | SMTP dos e-mails do Auth (confirmação de conta, recuperação de senha) | resend.com → Domains e API Keys |
| **Cloudflare Turnstile** | CAPTCHA no login, no cadastro e no "Esqueci minha senha" | dash.cloudflare.com → Turnstile |

### Vercel

- Produção: `https://fichamento-cientifico.vercel.app`. Funções na região `pdx1` (`vercel.json`), perto do Supabase.
- Variáveis de ambiente (Settings → Environment Variables):

| Variável | Onde vale | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | todos | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | todos | chave pública do Supabase |
| `SUPABASE_SECRET_KEY` | servidor | chave secreta do Supabase. Ignora RLS: nunca com prefixo `NEXT_PUBLIC_` |
| `WORKER_SECRET` | servidor | mesmo valor do segredo `worker_secret` no Vault do Supabase |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | só produção | Site Key do widget Turnstile (pública). Nos previews fica vazia e o widget não aparece |
| `EXTRACT_MODEL`, `CROSS_MODEL`, `JUDGE_MODEL` | opcional | modelos de reserva; o admin escolhe em Configurações → IA |

Na Vercel, o AI Gateway autentica por OIDC. `AI_GATEWAY_API_KEY` só é necessária localmente.

### Supabase

1. **Migrações:** `npx supabase link` e `npx supabase db push`. Se aplicar por outro caminho, confira se a versão gravada em `supabase_migrations.schema_migrations` é a do nome do arquivo.
2. **Vault (pipeline):** `worker_url` = `https://fichamento-cientifico.vercel.app/api/worker` e `worker_secret` = o mesmo `WORKER_SECRET` da Vercel.
3. **Authentication → URL Configuration**
   - Site URL: `https://fichamento-cientifico.vercel.app`
   - Redirect URLs: `https://fichamento-cientifico.vercel.app/auth/confirm**`
4. **Authentication → Emails → SMTP Settings** (Resend)

   | Campo | Valor |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | API key do Resend (guardada só no Supabase) |
   | Sender email | endereço do domínio verificado no Resend |
   | Sender name | `Fichamento` |

   Com SMTP próprio, o limite de envio fica em Authentication → Rate Limits (hoje, 30 e-mails por hora).
5. **Authentication → Emails → Templates** (só editáveis com SMTP próprio)
   - **Reset Password:** assunto "Criar senha nova no Fichamento", corpo igual a [`supabase/templates/recovery.html`](supabase/templates/recovery.html). O link é `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`.
   - **Confirm signup:** link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
6. **Authentication → Attack Protection:** CAPTCHA ligado, provedor Turnstile, com a Secret Key do widget (guardada só no Supabase).

### Resend

- Domínio próprio verificado (registros DNS em Domains). Sem domínio verificado, o Resend só entrega para o e-mail da própria conta.
- Uma API key com permissão "Sending access", que é a senha do SMTP no Supabase.
- O histórico de envios e recusas fica em Emails.

### Cloudflare Turnstile

- Widget em modo Managed, com o hostname `fichamento-cientifico.vercel.app`. Se o app ganhar um domínio novo, adicione-o em Hostnames.
- A Site Key vai para a Vercel (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) e a Secret Key para o Supabase (Attack Protection).
- Troca de senha e exclusão de conta não têm widget. Elas conferem a senha com a chave secreta do Supabase, que o Auth dispensa do CAPTCHA (`lib/supabase/verify-password.ts`).

### Contas e senhas

- **Esqueci minha senha:** o link do e-mail abre `/redefinir-senha` e vale 15 minutos (`lib/recovery.ts`).
- Quando o Supabase recusa um envio (CAPTCHA, limite de envio, SMTP), o app mostra o erro em vez de dizer que mandou o e-mail. O motivo fica nos logs da Vercel e em Supabase → Logs → Auth.
- Se o login parar de funcionar em produção, olhe primeiro os logs do Auth. `captcha_failed` quer dizer widget ausente ou chaves trocadas entre Cloudflare, Vercel e Supabase.

### Desenvolvimento local e CAPTCHA

O CAPTCHA fica desligado no `supabase/config.toml`, e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` fica vazia no `.env.local`. Assim os testes de integração entram sem CAPTCHA.

Para testar o widget localmente, ative `[auth.captcha]` com `provider = "turnstile"`, reinicie o Supabase e use as chaves de teste do Cloudflare:
- Site Key: `1x00000000000000000000AA`
- Secret que sempre aprova: `1x0000000000000000000000000000000AA`
- Secret que sempre recusa: `2x0000000000000000000000000000000AA`

Os e-mails locais chegam no Mailpit (`http://127.0.0.1:54324`).

## Licença

GPL-3.0. Ver [LICENSE](LICENSE).
