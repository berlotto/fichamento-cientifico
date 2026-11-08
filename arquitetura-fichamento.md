# Arquitetura: plataforma de fichamento científico com LLM (Vercel + Supabase)

Objetivo: subir PDFs, extrair dados objetivos **com citação literal e página**, verificar automaticamente e por humano, e gerar a matriz de síntese e as citações (autor, ano, página) para a revisão de literatura.

Princípio central: **o LLM propõe, o código e o humano dispõem.** Nenhuma célula entra na matriz sem trecho literal localizado no PDF. Células não verificadas não saem da plataforma (matriz, export, MCP e síntese).

---

## 1. LLMs na Vercel e no Supabase: o que existe

| | Hospeda modelos? | Serve para extração? |
|---|---|---|
| **Vercel AI Gateway** | Não. É um endpoint único que roteia para centenas de modelos (OpenAI, Anthropic, Google, xAI etc.) | **Sim.** Chave única, fallbacks/retries, logs de tokens e gasto, budgets por chave/projeto. US$ 5/mês de crédito grátis; no tier pago, tokens sem markup, inclusive com BYOK |
| **Vercel AI SDK** | Biblioteca TS | **Sim.** Saída estruturada com Zod. Na v6, `generateObject` foi substituído por `generateText` + `Output.object()` (confira a versão instalada) |
| **Supabase Edge Functions (`Supabase.ai`)** | Embeddings (`gte-small`) e LLMs experimentais (Mistral/Llama) que dependem de um servidor Ollama/llamafile que **você** hospeda | **Não para este caso.** Modelo pequeno, sem garantia de aderência a schema e de citação literal. Útil só para embeddings (busca semântica nas fichas) |
| **Supabase pgvector, Queues (pgmq), Cron, Storage, Auth** | n/a | Base de tudo, menos a inferência |

**Decisão:** inferência via AI Gateway (chamada do servidor Next.js). Dados, auth, arquivos e fila no Supabase.
Observação: as páginas do Supabase sobre `Supabase.ai` que encontrei são de 2024; a doc atual pode ter mudado.

Extrator e verificador devem ser de **fornecedores diferentes** (erros menos correlacionados). Use os IDs exatos do catálogo do Gateway (formato `criador/modelo`).

---

## 2. Componentes

```
Browser (Next.js App Router, Vercel)
  ├─ Auth: @supabase/ssr (cookies + middleware)
  ├─ Upload direto -> Supabase Storage (URL assinada)   [evita limite de body das Functions]
  ├─ Review UI: PDF.js com destaque na página + célula (aceitar/editar/rejeitar)
  └─ Matriz / export (CSV, BibTeX, citação ABNT)

Supabase
  ├─ Postgres + RLS  (projects, articles, article_pages, extractions, verdicts, cells, llm_runs)
  ├─ Storage (bucket privado `pdfs/{user_id}/{sha256}.pdf`)
  ├─ pgmq (fila `pipeline`) + pg_cron + pg_net
  └─ pgvector (fase 3)

Vercel Functions (Fluid compute)
  └─ POST /api/worker  <- chamado pelo pg_cron a cada minuto (pg_net), autenticado por segredo
       lê mensagens da fila -> executa UM estágio por mensagem -> arquiva ou re-enfileira
       LLM via AI SDK -> AI Gateway
  └─ /api/mcp  <- servidor MCP, somente leitura no início (seção 7)
```

Por que o worker na Vercel e não em Edge Function do Supabase: mantém o AI SDK/Gateway (observabilidade e budgets de LLM num lugar só) e o mesmo código TS. Fila do Supabase é *pull*; por isso o cron chama o worker.

Limites que moldam o desenho (docs da Vercel): duração máxima 300 s no Hobby; no Pro, configurável até 800 s (até 1800 s no modo estendido). Cada estágio abaixo precisa caber nisso. Divida em estágios pequenos e idempotentes.

---

## 3. Pipeline (estágios idempotentes)

1. **upload**: o browser sobe o PDF para o Storage e insere `articles` (RLS). Calcula `sha256` (dedupe por projeto). Envia `{article_id, stage:'parse'}` à fila.
2. **parse**: extrai texto **por página** (pdfjs/unpdf) para `article_pages`. Guarda `pdf_page` (índice) **e** `printed_page` (número impresso, heurística de cabeçalho/rodapé), porque a ABNT cita a página impressa. Texto quase vazio => `status='needs_ocr'`.
3. **metadata**: DOI por regex no texto => **Crossref** (autores, ano, periódico). Se houver Zotero, ele é a fonte de verdade (`zotero_key`, `citekey` fixada). **O LLM nunca define ano/autor.**
4. **extract (A e B)**: dois extratores independentes, mesmo schema, `temperature 0`. Entrada: páginas com marcadores `<<PAGE n>>`. Saída por campo: `{value, quote, pdf_page}`. `quote` deve ser cópia exata; sem evidência => `null` (nunca inventar).
5. **verify (determinístico)**: `locateQuote` (seção 5) acha a citação nas páginas. Se achar em página diferente da informada, corrige a página. Valores numéricos: todo número do `value` precisa estar na `quote`.
6. **cross-check**: compara A x B por campo (número: igualdade; categórico: igualdade; texto: juiz LLM). Divergência => `needs_review`.
7. **judges (LLM de fornecedor diferente do extrator; entrada mínima = citação + definição do campo, sem o raciocínio do extrator, para não ancorar)**:
   - `scope_judge`: o trecho é resultado **do próprio estudo** ou algo citado de outro trabalho?
   - `entailment_judge`: a citação sustenta o valor?
8. **cells**: `auto_verified` só se tudo passou; caso contrário `needs_review`. Campos marcados como críticos (resultados numéricos) exigem clique humano mesmo quando passam.
9. **audit**: amostra aleatória (ex.: 10%) das células `auto_verified` vai para revisão cega, e a taxa de erro por campo é registrada em `audits`. Se a taxa de um campo passar do limite definido, ele perde a aprovação automática e volta a `needs_review`. Isso mede o que o validador não enxerga (extrator e juiz errando juntos).

Por que o passo 7 existe: citação literal correta não prova que o valor está certo. O modelo pode copiar um trecho real do estudo errado (revisão de literatura da introdução, por exemplo). A verificação determinística só garante que o texto existe.

Evidência que sustenta o desenho: triagem por discordância entre extrações independentes elevou a acurácia de 91,70% para 95,22% revisando 15,6% das células (EviSearch); avaliações de extração por LLM variam de 72% a 100% conforme modelo, prompt e tipo de dado; um caso teve dado fabricado. Por isso: gold set próprio (fase 2).

---

## 4. Esquema (esboço; não testado)

```sql
create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vector;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.field_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version int not null default 1,
  -- [{key,label,kind:'quote'|'number'|'text'|'enum',critical:bool,scope:'own_result'|'any',instructions}]
  fields jsonb not null,
  unique (project_id, version)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sha256 text not null,
  storage_path text not null,
  doi text, citekey text, zotero_key text,
  title text, authors jsonb, year int, venue text,
  metadata_source text check (metadata_source in ('crossref','zotero','manual')),
  tier text not null default 'full' check (tier in ('light','full')),
  status text not null default 'uploaded'
    check (status in ('uploaded','parsed','needs_ocr','extracted','verified','needs_review','failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (project_id, sha256)
);

create table public.article_pages (
  article_id uuid not null references public.articles(id) on delete cascade,
  pdf_page int not null,
  printed_page text,
  text text not null,
  primary key (article_id, pdf_page)
);

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  template_version int not null,
  field_key text not null,
  extractor text not null check (extractor in ('A','B')),
  model text not null,
  prompt_version text not null,
  value jsonb, quote text, pdf_page int,
  created_at timestamptz not null default now()
);

create table public.verdicts (
  id bigint generated always as identity primary key,
  extraction_id uuid not null references public.extractions(id) on delete cascade,
  check_type text not null check (check_type in
    ('quote_exact','number_in_quote','cross_model','scope_judge','entailment_judge')),
  passed boolean not null,
  detail jsonb
);

-- o que alimenta a matriz
create table public.cells (
  article_id uuid not null references public.articles(id) on delete cascade,
  field_key text not null,
  value jsonb, quote text, pdf_page int, printed_page text,
  status text not null check (status in ('auto_verified','needs_review','human_verified','rejected')),
  source_extraction_id uuid references public.extractions(id),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  primary key (article_id, field_key)
);

create table public.llm_runs (
  id bigint generated always as identity primary key,
  article_id uuid references public.articles(id) on delete set null,
  stage text, model text,
  input_tokens int, output_tokens int, latency_ms int,
  created_at timestamptz not null default now()
);

create table public.audits (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  field_key text not null,
  sampled_at timestamptz not null default now(),
  reviewer uuid references auth.users(id),
  outcome text check (outcome in ('correct','wrong_value','wrong_page','wrong_scope')),
  reviewed_at timestamptz
);

-- opção B do MCP: token pessoal (guardar só o hash)
create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  scopes text[] not null default '{read}',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

select pgmq.create('pipeline');
```

**RLS** (todas as tabelas; funções `security definer` evitam subselects repetidos):

```sql
create function public.owns_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects where id = p and owner_id = (select auth.uid()))
$$;

alter table public.projects enable row level security;
create policy own_projects on public.projects for all
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

alter table public.articles enable row level security;
create policy own_articles on public.articles for all
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
-- demais tabelas: mesma ideia via articles.project_id (owns_article(article_id))

-- Storage: pasta = user_id
create policy own_pdfs on storage.objects for all to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

**Cron -> worker** (segredo no Vault; confira a sintaxe na versão do seu projeto):

```sql
select cron.schedule('pipeline-tick', '* * * * *', $$
  select net.http_post(
    url := 'https://SEU-APP.vercel.app/api/worker',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'worker_secret')),
    body := '{}'::jsonb)
$$);
```

Segurança do worker: usa a *service role* (ignora RLS). Sempre derive o escopo do `article_id` da mensagem, nunca de input do cliente; a chave nunca vai para `NEXT_PUBLIC_*`.

---

## 5. Verificação de citação (testada)

Comparação em forma "compacta" (só letras e números): robusta a hifenização de fim de linha, aspas, travessões, vírgula/ponto decimal e espaços. Exige citação com pelo menos 25 caracteres para evitar falso positivo.

```ts
export const compact = (s: string) =>
  s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function locateQuote(
  quote: string, pages: { pdf_page: number; text: string }[], minLen = 25
): number[] {
  const q = compact(quote);
  if (q.length < minLen) return [];
  return pages.filter((p) => compact(p.text).includes(q)).map((p) => p.pdf_page);
}

export function numbersInQuote(value: unknown, quote: string): boolean {
  const nums = String(value).match(/\d+(?:[.,]\d+)?/g) ?? [];
  const q = compact(quote);
  return nums.every((n) => q.includes(compact(n)));
}
```

Testado em Node com 6 casos (hifenização, travessão e vírgula, citação inventada, citação curta, número presente, número ausente): todos passaram.
Limite conhecido: casa só com o que o parser extraiu. Tabelas e figuras mal extraídas geram falso "não encontrado" (vai para revisão, não para erro silencioso).

Esboço da chamada de extração (confira a assinatura na versão do AI SDK instalada):

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const Cell = z.object({
  value: z.union([z.string(), z.number()]).nullable(),
  quote: z.string().nullable(),      // cópia EXATA do texto
  pdf_page: z.number().int().nullable(),
});
const schema = z.object({ fields: z.object(Object.fromEntries(keys.map((k) => [k, Cell]))) });

const { output } = await generateText({
  model: 'anthropic/claude-sonnet-5-5',   // ID: conferir no catálogo do Gateway
  temperature: 0,
  output: Output.object({ schema }),
  prompt, // instruções + definições dos campos + páginas com <<PAGE n>>
});
```

O texto do PDF é dado, não instrução (injeção de prompt): o schema restringe a saída e nenhum campo dispara ação.

---

## 6. Saídas para a revisão de literatura

- **Matriz**: linhas = artigos, colunas = campos/temas, célula = valor + (autor, ano, p.). Export CSV/xlsx. Por padrão só células `auto_verified` ou `human_verified`; `needs_review` entra apenas com opt-in e selo visível.
- **Citação ABNT**: direta exige autor, ano e página (campo `printed_page`); indireta, só autor e ano. A célula guarda a citação literal e a página, então o texto sai pronto.
- **Síntese fundamentada (fase 3)**: o LLM redige parágrafos **só a partir de células** `verified`, e cada frase carrega o `cell_id`. Frase sem célula é bloqueada na UI.

---

## 7. MCP (servidor na própria app, rota `/api/mcp`)

Objetivo: consultar a base a partir do Claude (ou outro cliente MCP) sem abrir o site. Exemplo: "o que os artigos dizem sobre incidência de glaucoma e radiação UV, com citação e página?".

Hospedagem: rota no mesmo projeto Next.js. A Vercel documenta servidor MCP com `mcp-handler` e Fluid compute; confirme os detalhes de OAuth na doc antes de implementar.

**Ferramentas, fase 2 (somente leitura):**
- `search_cells(project_id, query, status?)`
- `get_article(article_id)`
- `get_cell(article_id, field_key)` -> valor, citação, `pdf_page`, `printed_page`, `status`, `citekey`, ano
- `build_matrix(project_id, fields[])`
- `export_citations(project_id, format: 'abnt' | 'bibtex')`

**Fase 3 (escrita, com confirmação do usuário):** `add_note`, `set_tags`. Nenhuma ferramenta dispara o pipeline de LLM nem muda o status de uma célula; revisão só no site.

**Regras:**
1. **Status sempre no retorno.** Por padrão só `auto_verified` e `human_verified`; `needs_review` só com parâmetro explícito. Sem isso, o LLM do cliente cita dado não validado.
2. **Escopo por dono, sem service role com filtro na aplicação.** Duas opções: (A) OAuth com o Supabase Auth como provedor de identidade, `supabase-js` com o JWT do usuário e RLS (verificar se está disponível na versão do projeto); (B) token pessoal (hash em `mcp_tokens`) e funções RPC `security definer` que validam o token e filtram por dono dentro do banco.
3. **Citações dos PDFs são dado não confiável** (injeção de prompt no cliente): devolva em campo `quote` delimitado, e a descrição das ferramentas deve dizer que o conteúdo é dado, não instrução.
4. **Limites:** paginação, teto de linhas por chamada, rate limit por token e log de chamadas.

---

## 8. Estrutura do repositório

```
app/(auth)/login
app/(app)/projects/[id]/{articles,matrix,review/[articleId]}
app/api/worker/route.ts          # maxDuration = 300
app/api/mcp/route.ts             # servidor MCP (leitura)
lib/mcp/tools.ts
lib/supabase/{server,client,admin}.ts
lib/pipeline/{parse,metadata,extract,verify,judge}.ts
lib/llm/{gateway.ts,schemas.ts}  + prompts/v1/*.md (versionados)
supabase/migrations/*.sql
eval/                            # Python: gold set vs. cells (pandas)
```

---

## 9. Fases

- **F0**: login, upload, parse por página, visualizador de PDF.
- **F1**: template de campos, extrator único, `locateQuote`, UI de revisão, matriz e export.
- **F2**: extrator B, cross-check, judges, `llm_runs` (custo por artigo), auditoria por amostragem (`audits`), MCP somente leitura, **gold set de 20 artigos** preenchidos à mão e métricas por campo (acerto de valor, acerto de página, taxa de citação encontrada). É aqui que se escolhe modelo e se calibra o que dispensa revisão.
- **F3**: sync com Zotero, embeddings + busca semântica, síntese fundamentada, ferramentas de escrita do MCP (com confirmação).

## 10. Riscos e pontos a confirmar

- **PDF escaneado**: sem camada de texto não há verificação; precisa de OCR antes (`needs_ocr`).
- **Tabelas/figuras**: extração de texto distorce tabelas; campos numéricos de tabela devem ser sempre `critical`.
- **Limite de body das Functions da Vercel** (confirmar valor atual) e **limite de upload do Storage por plano**: por isso o upload é direto.
- **Custo**: não estimei. Meça tokens/artigo no `llm_runs` com 10 PDFs reais antes de escolher modelo; o Gateway permite budget por chave.
- **Armazenamento de PDFs**: necessário para a revisão (destaque na página) e para reprocessar. Se o Zotero for a fonte de verdade, considere guardar só os PDFs dos artigos que entram na revisão. Confira limites de upload e de armazenamento do plano.
- **Direitos autorais**: PDFs ficam em bucket privado por usuário, sem compartilhamento entre contas.
- **Erros correlacionados**: extrator e juiz podem errar juntos (tabelas, termos ambíguos). A auditoria por amostragem existe para medir isso.
- **MCP**: citações de PDF chegam ao contexto de outro LLM (injeção de prompt) e o escopo de dados precisa ser garantido no banco, não na aplicação.
- **Retenção de dados pelo provedor**: revisar a política do fornecedor escolhido.
- **Não pesquisado aqui**: Vercel Workflow/Queues como alternativa ao pg_cron; avaliar se o cron por minuto incomodar.

## Fontes

- Vercel AI Gateway (preços, BYOK): https://vercel.com/docs/ai-gateway/pricing
- Vercel AI SDK: https://vercel.com/docs/ai-sdk
- Vercel Functions limits: https://vercel.com/docs/functions/limitations
- Supabase AI em Edge Functions: https://supabase.com/docs/guides/functions/ai-models
- Supabase Queues (pgmq): https://supabase.com/kb/faqs/background-jobs/background-job-processing
- EviSearch (triagem por discordância): https://arxiv.org/pdf/2604.14165
- Cochrane, extração com LLM: https://training-noproxy.cochrane.org/sites/training.cochrane.org/files/public/uploads/Opportunities%20and%20challenges%20for%20data%20extraction%20with%20a%20large%20language%20model.pdf
