# Plano de implementação: plataforma de fichamento científico

Base: `arquitetura-fichamento.md`. Este plano segue as fases F0–F3 de lá, quebra cada uma em tarefas com critério de pronto e registra ajustes que a arquitetura precisa antes de virar código (seção 0).

Convenção: cada tarefa tem **entregável** e **pronto quando**. Uma fase só começa quando o critério de saída da anterior foi atingido.

## Andamento (2026-11-08)

| Tarefa | Situação |
|---|---|
| F0.1 Repositório | Feito. `npm` no lugar de `pnpm`. Next 16.4 com Cache Components; `middleware.ts` virou `proxy.ts`. CI em `.github/workflows/ci.yml` (ainda não rodou no GitHub) |
| F0.2 Supabase local | Feito: `supabase/migrations/20261108000000_f0_init.sql`. A2, A3, A9 aplicados; colunas do pipeline (`status`, `error`, `page_count`) não são graváveis pelo usuário. Teste de RLS em `tests/integration/f0.int.test.ts` |
| F0.3 Auth | Feito (e-mail + senha; rota `/auth/confirm` para o link de confirmação) |
| F0.4 Projetos | Criar e listar. Renomear/excluir: pendente |
| F0.5 Upload | Feito. Upload direto ao Storage com a sessão do usuário (RLS por pasta), sem URL assinada |
| F0.6 Worker | Feito, com testes de falha após 3 tentativas |
| F0.7 Cron | Feito e testado localmente: upload → `parsed` em 42 s sem ação manual. Produção pendente |
| F0.8 Parse | Feito com `unpdf`; testado com PDF sintético. **Falta testar com 5 PDFs reais** |
| F0.9 Visualizador | Feito com o visualizador de PDF do navegador (iframe). PDF.js com destaque fica para a F1.7, onde é necessário |
| A11 Limpeza de PDFs | Pendente: excluir artigo não apaga o arquivo do Storage |

### F1 (2026-11-09), versão simplificada

Em vez do template de campos editável (F1.1) e das tabelas `extractions`/`verdicts`/`cells`, a primeira versão usa um conjunto fixo de campos numa tabela só, `article_fields`. O template editável continua no plano.

| Tarefa | Situação |
|---|---|
| F1.2 Metadados | Feito. DOI das 2 primeiras páginas → Crossref; sem DOI, busca por título exigindo também primeiro autor e ano (±1). O LLM só preenche o que o Crossref não traz. Novos campos: subtítulo, língua, volume, número, páginas (ou número do artigo) |
| F1.3/F1.4 Extração | Feito. Estágio `extract` depois do `parse`, uma chamada ao LLM com `<<PAGE n>>`: metadados + resumo (copiado do autor quando existe), assunto, objetivo, método, resultados, conclusões, cada um com trecho e página. Modelo por `EXTRACT_MODEL` |
| F1.5 Verificação | Feito com `verify.ts`: trecho localizado no PDF e números do valor presentes no trecho. Artigo fica `extracted` se tudo confere, senão `needs_review` |
| F1.9 Referências | ABNT, APA 7, Vancouver e BibTeX montadas por código (`lib/citation.ts`) |
| Importar por URL | Feito. Link direto do PDF ou página do artigo (`citation_pdf_url`); bloqueio de IP interno, 50 MB, 30 s |
| F1.1 Campos | Versão simples: 6 campos fixos + campos personalizados por projeto (`project_fields`, até 20), sem versionamento de template. "Extrair de novo" (artigo ou projeto) preserva os campos já revisados |
| F1.7 Revisão | Feito na própria ficha: aceitar, editar (valor e trecho; o trecho é conferido de novo no PDF) e rejeitar; desfazer. Artigo vira `verified` quando nada está pendente (trigger). O link da página abre o visualizador com o trecho destacado |
| F1.8 Matriz | Feito: `/matrix/[projectId]`, só revisados por padrão, "incluir a revisar" com selo |
| F1.9 Export | Excel (.xlsx gerado com `fflate`), CSV (`;` + BOM, fórmulas neutralizadas), BibTeX e lista ABNT ordenada |
| Custo | `llm_runs` com tokens, custo (informado pelo AI Gateway) e latência; total e média na visão do projeto |
| F1.10 Gold set | A taxa de acerto sai das próprias revisões (valor original do LLM guardado em `llm_value`): tabela "Qualidade da extração" por campo. Gold set independente, preenchido sem ver o LLM, continua na F2 |
| F2.1–F2.4 Verificação | Feito: estágio `crosscheck` depois do `extract` (mensagem própria). Segundo extrator de outro fornecedor (`CROSS_MODEL`, padrão gemini-3.5-flash) e juiz (`JUDGE_MODEL`, padrão claude-haiku-5.5) que responde por campo: os dois concordam? o trecho sustenta o valor? é deste estudo? Aprovação automática opcional por projeto, nunca em campo crítico (padrão: resultados). Resumo do autor não exige concordância (é tradução) |
| F2.5 Custo | `llm_runs` por estágio (extract, extract_b, judge) |
| F2.6 Auditoria | Feito: 10% das aprovações automáticas vão para `/projects/[id]/audit` (a pessoa escreve a própria leitura antes de ver o valor). Campo com erro > 10% em 5+ auditorias perde a aprovação automática |
| Pendente F2 | F2.7 gold set de 20 artigos com comparação de combinações de modelos; F2.8 MCP |
| F0 pendentes | Renomear/excluir projeto e artigo; A11 (PDF sai do Storage quando nenhum artigo o usa). Parse testado com 5 PDFs reais (PLOS, BMC, eLife, arXiv, Frontiers): "Page X of Y" passou a contar como página impressa; texto com fonte deslocada (eLife) é consertado. Falta um PDF escaneado e um da SciELO |

---

## 0. Ajustes na arquitetura antes de codar

Pontos que encontrei na leitura e que mudam esquema ou fluxo. Resolver no início evita migração depois.

| # | Problema | Ajuste proposto |
|---|---|---|
| A1 | `cells` tem PK `(article_id, field_key)` sem versão de template. Mudar o template deixa células antigas misturadas com novas. | Adicionar `template_version` em `cells` (PK passa a incluí-la) ou invalidar células quando o template muda. Recomendo a coluna. |
| A2 | O browser "envia à fila" no upload, mas o cliente não deve chamar `pgmq` diretamente. | Trigger `after insert on articles` (`security definer`) que faz `pgmq.send('pipeline', {article_id, stage:'parse'})`. |
| A3 | Fila sem política de falha: mensagem que estoura o tempo volta para a fila para sempre. | Usar `read_ct` do pgmq: após N tentativas (ex.: 3) marcar `articles.status='failed'`, gravar `error` e arquivar. Visibility timeout > `maxDuration` do worker. |
| A4 | Extratores A e B rodam em mensagens separadas; o cross-check precisa dos dois (fan-in). | Estágios `extract_A` e `extract_B` gravam e, no fim, cada um checa se o outro terminou; o último enfileira `verify`. Idempotência por `(article_id, template_version, extractor)`. |
| A5 | `locateQuote` testa página por página: citação que atravessa a quebra de página dá "não encontrada". | Testar também a concatenação de páginas adjacentes (n + n+1) e registrar a página inicial. |
| A6 | `numbersInQuote` compara em forma compacta: `1.5` e `15` viram a mesma string, e `15` passa se a citação tiver `150`. | Comparar números com fronteira (regex `(?<!\d)n(?!\d)`) sobre texto normalizado com vírgula→ponto, não na forma compacta. |
| A7 | F1 tem um extrator só e nenhum juiz, mas o fluxo prevê `auto_verified`. | Em F1, toda célula entra como `needs_review`. `auto_verified` só existe a partir de F2. |
| A8 | Gold set só em F2, mas a escolha do modelo e do prompt começa em F1. | Começar o gold set em F1 com 5 artigos; completar os 20 em F2. |
| A9 | `verdicts`, `extractions`, `article_pages`, `audits`, `llm_runs` sem RLS escrito. | Criar `owns_article(article_id)` e aplicar em todas; `mcp_tokens` com `user_id = auth.uid()`. Índices em `article_id` de todas as tabelas filhas. |
| A10 | `needs_ocr` não tem caminho de saída. | Fora do escopo até F3: mostrar aviso na UI e permitir que o usuário suba um PDF já com OCR (ex.: `ocrmypdf` local). |
| A11 | O mesmo PDF em dois projetos do mesmo usuário compartilha `storage_path`; apagar um artigo não pode apagar o arquivo. | Remover o objeto do Storage só quando nenhum `articles` referencia o `sha256` do usuário (função de limpeza, não cascade). |

---

## F0: fundação (login, upload, parse, visualizador)

**Objetivo:** subir um PDF e ver o texto extraído por página ao lado do PDF.

| Tarefa | Entregável | Pronto quando |
|---|---|---|
| F0.1 Repositório | Next.js (App Router, TS strict), ESLint, Prettier, Vitest; estrutura da seção 8; `git init` | `pnpm build` e `pnpm test` passam no CI (GitHub Actions) |
| F0.2 Supabase local | `supabase init`, migração inicial com `projects`, `articles`, `article_pages`, extensões, fila `pipeline`, RLS (A9), bucket `pdfs` + policy | `supabase db reset` sobe limpo; teste de RLS: usuário B não lê dados do usuário A |
| F0.3 Auth | `@supabase/ssr`, middleware, `/login` (magic link ou e-mail+senha), `lib/supabase/{server,client,admin}.ts` | Rotas `(app)` redirecionam sem sessão; `admin.ts` só importável no servidor (`server-only`) |
| F0.4 Projetos | CRUD de projetos | Usuário cria e lista os próprios projetos |
| F0.5 Upload | Hash SHA-256 no browser (Web Crypto), upload por URL assinada para `pdfs/{user_id}/{sha256}.pdf`, insert em `articles`, trigger de fila (A2) | PDF de 30 MB sobe sem passar pela Function; reenvio do mesmo PDF no projeto é recusado com mensagem clara |
| F0.6 Worker | `app/api/worker/route.ts`: valida `Bearer`, lê lote do pgmq, despacha por `stage`, arquiva ou trata falha (A3). `maxDuration = 300` | Teste de integração: mensagem `parse` processada; mensagem que falha 3× vira `failed` |
| F0.7 Cron | `pg_cron` + `pg_net` + segredo no Vault chamando o worker | Em produção, um upload vira `parsed` em até ~2 min sem ação manual |
| F0.8 Parse | `lib/pipeline/parse.ts` com `unpdf`: texto por página, `printed_page` por heurística, `needs_ocr` se texto < limiar | Testado com 5 PDFs reais de formatos diferentes (2 colunas, com cabeçalho numerado, escaneado) |
| F0.9 Visualizador | Página do artigo: PDF.js à esquerda, texto da página à direita, navegação por página | Página `pdf_page` e `printed_page` aparecem lado a lado |

**Critério de saída F0:** fluxo upload → parse → visualização funcionando em produção (Vercel + Supabase hospedado) com 10 PDFs reais.

**Decisões a tomar em F0:** plano Vercel (Hobby limita a 300 s e proíbe uso comercial); plano Supabase (limite de upload por arquivo).

---

## F1: extração com citação e revisão humana

**Objetivo:** template de campos, um extrator, verificação determinística, revisão e matriz exportável.

| Tarefa | Entregável | Pronto quando |
|---|---|---|
| F1.1 Template de campos | Tabela `field_templates` + UI para editar campos (`key`, `label`, `kind`, `critical`, `scope`, `instructions`); nova versão a cada edição | Editar o template cria `version+1`; artigos antigos mantêm a versão com que foram extraídos |
| F1.2 Metadados | `lib/pipeline/metadata.ts`: DOI por regex → Crossref; fallback `manual` com formulário | 8 de 10 PDFs de teste com DOI ganham autor/ano/periódico corretos; o LLM não toca nesses campos |
| F1.3 Gateway + schemas | `lib/llm/gateway.ts`, `lib/llm/schemas.ts` (Zod gerado do template), `prompts/v1/extract.md`; gravação em `llm_runs` | Chamada real retorna objeto válido no schema; tokens e latência gravados. Conferir a API do AI SDK instalado (`generateText` + `Output.object`) |
| F1.4 Extração | Estágio `extract_A`; páginas com `<<PAGE n>>`; grava `extractions` | Idempotente: reprocessar não duplica linhas |
| F1.5 Verificação | `lib/pipeline/verify.ts`: `locateQuote` com A5, `numbersInQuote` com A6; corrige `pdf_page`; grava `verdicts`; cria `cells` como `needs_review` (A7) | Testes unitários: os 6 casos originais + citação entre páginas + `1.5` vs `15` + `15` vs `150` |
| F1.6 Migração `cells` | Esquema de `cells` com A1 | `cells` por versão de template |
| F1.7 UI de revisão | `review/[articleId]`: lista de campos, clique destaca a citação no PDF (camada de texto do PDF.js), aceitar/editar/rejeitar, grava `reviewed_by/at` | Revisar um artigo de 15 campos em menos de 5 min; editar o valor exige manter ou trocar a citação |
| F1.8 Matriz | `matrix`: artigos × campos, célula = valor + (autor, ano, p.); filtro por status; só `human_verified` por padrão | Célula `needs_review` só aparece com opt-in e selo visível |
| F1.9 Export | CSV, xlsx, BibTeX, citação ABNT (direta com `printed_page`; indireta sem página) | ABNT conferida à mão em 10 citações |
| F1.10 Gold set inicial | 5 artigos preenchidos à mão no mesmo template (A8); script `eval/` que compara com `cells` | Relatório por campo: acerto de valor, acerto de página, % de citação encontrada |

**Critério de saída F1:** você consegue fichar um projeto real de 20 artigos de ponta a ponta, com toda célula revisada, e exportar a matriz.

---

## F2: verificação automática, custo e MCP

**Objetivo:** reduzir revisão humana com evidência medida, não por confiança.

| Tarefa | Entregável | Pronto quando |
|---|---|---|
| F2.1 Extrator B | Estágio `extract_B` com modelo de outro fornecedor; fan-in (A4) | A e B gravados para o mesmo artigo; `verify` enfileirado uma vez só |
| F2.2 Cross-check | Comparação por `kind` (número/enum: igualdade; texto: juiz LLM); verdict `cross_model` | Divergência gera `needs_review` com os dois valores visíveis na UI |
| F2.3 Juízes | `lib/pipeline/judge.ts`: `scope_judge` e `entailment_judge`, fornecedor diferente do extrator, entrada só citação + definição do campo | Verdicts gravados; testes com casos de citação vinda da introdução (deve reprovar) |
| F2.4 Regra de status | `auto_verified` só se todos os verdicts passaram e o campo não é `critical` | Campo crítico nunca fica `auto_verified` |
| F2.5 Custo | Painel por artigo e por projeto a partir de `llm_runs`; budget no Gateway | Custo médio por artigo medido com 10 PDFs reais |
| F2.6 Auditoria | Amostra de 10% das `auto_verified` vai para revisão cega (sem mostrar o valor do LLM antes da resposta); grava `audits`; campo acima do limite perde aprovação automática | Taxa de erro por campo visível; rebaixamento automático testado |
| F2.7 Gold set completo | 20 artigos; comparação de pelo menos 2 combinações de modelos | Escolha de modelo documentada com números (acerto, custo, latência) |
| F2.8 MCP leitura | `app/api/mcp/route.ts` com `mcp-handler`; ferramentas da seção 7; auth opção B (token com hash, RPC `security definer`) para começar, A (OAuth) depois se a doc confirmar suporte | Claude Desktop/Code consulta um projeto; token de outro usuário não vê nada; `needs_review` só com parâmetro explícito; paginação e rate limit ativos |

**Critério de saída F2:** com o gold set, a taxa de erro das células `auto_verified` por campo está medida e abaixo do limite que você definir; campos acima do limite ficam em revisão humana.

---

## F3: integrações e síntese

| Tarefa | Entregável | Pronto quando |
|---|---|---|
| F3.1 Zotero | Sync por API do Zotero; `zotero_key` e `citekey` como fonte de verdade de metadados | Metadado editado no Zotero aparece na matriz após sync |
| F3.2 Embeddings | `pgvector` + embeddings das células verificadas; `search_cells` semântico | Busca por tema retorna células relevantes com citação |
| F3.3 Síntese fundamentada | Redação de parágrafos só a partir de células verificadas; cada frase com `cell_id`; frase sem célula bloqueada | Nenhuma frase exportada sem célula de origem |
| F3.4 MCP escrita | `add_note`, `set_tags` com confirmação; nada altera status de célula | Testado no cliente MCP |
| F3.5 OCR | Caminho para `needs_ocr` (A10), se o volume justificar | — |

---

## Testes e qualidade (todas as fases)

- **Unitários (Vitest):** `compact`, `locateQuote`, `numbersInQuote`, heurística de `printed_page`, geração de schema Zod a partir do template, formatação ABNT.
- **Banco:** testes de RLS com dois usuários (pgTAP ou script com `supabase-js`) rodando no CI contra `supabase start`.
- **Pipeline:** testes de integração do worker com LLM mockado (fixtures de resposta) para não gastar tokens no CI.
- **Avaliação:** `eval/` em Python roda contra o gold set antes de qualquer troca de modelo ou de prompt; prompts versionados em `prompts/vN/`.
- **Segurança:** `SUPABASE_SERVICE_ROLE_KEY` e `WORKER_SECRET` só no servidor; worker deriva escopo do `article_id` da mensagem; texto do PDF tratado como dado nos prompts.

---

## Ordem sugerida das primeiras semanas

1. F0.1–F0.3 (repo, banco, auth) — base para todo o resto.
2. F0.5–F0.8 (upload, fila, worker, parse) — a parte com mais risco de infraestrutura; valida limites de Vercel/Supabase cedo.
3. F0.9 e F1.5 em paralelo — `verify.ts` é código puro e já tem testes escritos.
4. F1.1–F1.4 — primeira extração real; medir tokens de 10 PDFs já aqui.
5. F1.7–F1.10 — revisão, matriz, export e gold set inicial.

## Decisões em aberto

- Plano Vercel (Hobby x Pro) e Supabase (Free x Pro).
- Modelos de extrator e de juiz (decidir com dados do gold set, F2.7).
- Limite de erro aceitável por campo para aprovação automática (F2).
- Pg_cron por minuto x Vercel Queues/Workflow (avaliar só se o cron incomodar).
- MCP: OAuth (opção A) ou token pessoal (opção B) como forma definitiva.
