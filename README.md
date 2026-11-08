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
app/(auth)/login                 login e cadastro
app/(app)/projects/...           projetos, upload, visualizador
app/api/worker/route.ts          worker do pipeline (Bearer WORKER_SECRET)
proxy.ts                         renova sessão Supabase (antigo middleware)
lib/supabase/{server,client,admin,proxy}.ts
lib/pipeline/{worker,parse,printed-page,verify,supabase-deps}.ts
supabase/migrations/*.sql
tests/integration/               testes contra o Supabase local
```

## Produção

1. Projeto Supabase: `npx supabase link` e `npx supabase db push`.
2. Vercel: variáveis de `.env.example` (`SUPABASE_SECRET_KEY` e `WORKER_SECRET` só no servidor).
3. No Vault do Supabase de produção: `worker_url` = `https://<app>.vercel.app/api/worker` e `worker_secret` = mesmo `WORKER_SECRET`.
4. Auth → templates de e-mail: link de confirmação para `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.

## Licença

GPL-3.0. Ver [LICENSE](LICENSE).
