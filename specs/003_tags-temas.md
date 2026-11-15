# 1.3 Tags e temas

**Spec**: 003_tags-temas.md
**Status**: done (aguardando validação do usuário)
**Data**: 2026-11-14

## Contexto

A matriz organiza o projeto por campo (objetivo, método, resultados). Para escrever um capítulo, o pesquisador pensa por **tema**: "o que todos os artigos dizem sobre limitação amostral?". Ferramentas de análise qualitativa (NVivo, Atlas.ti) resolvem isso com codificação: marcar trechos com códigos e depois juntar todos os trechos de um código.

## Descrição

1. Cada projeto tem uma lista de tags (nome, cor, descrição opcional), com hierarquia de um nível (tema > subtema).
2. Tags podem ser aplicadas a: artigo inteiro, campo da ficha, citação à mão (spec 002).
3. Uma página "Temas" do projeto lista as tags com contagem; ao abrir uma tag, mostra todos os trechos marcados, agrupados por artigo, com citação e página.
4. Filtro por tag na lista de artigos e na matriz.
5. Exportar o conteúdo de uma tag (xlsx/Markdown) com as citações prontas.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Tabelas `tags` (por projeto, com `parent_id`) e `taggings` (alvo polimórfico: artigo, campo, citação) com RLS | ✅ |
| R2 | Criar, renomear, mudar cor, juntar duas tags e excluir | ✅ |
| R3 | Aplicar e remover tag em artigo, campo e citação, com autocompletar | ✅ |
| R4 | Página "Temas" com contagem por tag | ✅ |
| R5 | Visão de uma tag: trechos agrupados por artigo, com link para o visualizador | ✅ |
| R6 | Filtro por tag na lista de artigos e na matriz | ✅ |
| R7 | Exportar uma tag em xlsx e Markdown | ✅ |
| R8 | Limite de tags por projeto | ✅ |

## Critérios de Aceite

- [x] Juntar a tag A na B move todas as marcações de A para B e apaga A
- [x] Excluir uma tag pede confirmação e mostra quantas marcações serão removidas
- [x] Excluir um artigo remove as marcações dele
- [x] Uma tag de um projeto não aparece em outro
- [x] A visão da tag mostra cada trecho com (AUTOR, ano, p.)

## Fora do Escopo

- Sugestão automática de tags pelo LLM (pode virar spec própria)
- Tags compartilhadas entre projetos
- Hierarquia com mais de dois níveis

## Fluxo do Usuário

1. Na ficha, no campo Resultados, clica em "+ tag" e digita "limitação amostral" (cria se não existir).
2. Faz o mesmo em outros artigos.
3. Abre "Temas", clica em "limitação amostral" e vê os 7 trechos de 5 artigos, prontos para escrever o parágrafo.

## Notas Técnicas

- Alvo polimórfico: preferir colunas separadas e anuláveis (`article_id`, `field_key`, `quote_id`) com `check` de exatamente um alvo, em vez de `target_type/target_id` sem chave estrangeira. Assim o `on delete cascade` funciona.
- A visão da tag é uma consulta com joins; colocar numa função SQL `security invoker` para respeitar RLS.
- A busca semântica (F3.2) pode depois sugerir trechos para uma tag.

## Dependências

- Usa: 002 (citações), 001 (se tag em comentário for aceita).
- Ligada a F3.2 (embeddings) e F3.4 (MCP `set_tags`, já previsto no plano).

## Perguntas em aberto (respondidas na implementação)

1. ~~Um nível basta?~~ Sim: tema › subtema. O banco recusa um terceiro nível.
2. ~~Tag em comentário?~~ Não por enquanto: o comentário é marcado junto com o campo.
3. ~~Sugestão pelo LLM?~~ Depois, em spec própria.

## Decisões tomadas na implementação (2026-11-16)

- **Banco** (`20261116000100_tags.sql`):
  - `tags`: nome único por projeto, sem diferenciar maiúsculas, com 1 a 60 caracteres. Seis cores fixas, descrição de até 500 caracteres e `parent_id` de um nível.
  - `taggings`: o artigo sempre preenchido (para a RLS e o cascade), mais `field_key` ou `quote_id`. Sem nenhum dos dois, a marca vale para o artigo inteiro.
  - Triggers garantem tag e alvo no mesmo projeto, citação do mesmo artigo, um nível só e o limite de 300 tags por projeto.
- **Juntar tags**: a função `merge_tags` roda com as permissões de quem chama (`security invoker`, sob RLS). Ela move as marcações sem duplicar, passa os subtemas para a tag de destino e apaga a de origem.
- **Excluir um tema**: os subtemas viram temas (`on delete set null`), e as marcações do tema somem.
- **Reextração**: a marcação de campo é pela chave do campo, então sobrevive à reextração, como o comentário da spec 001.
- **Ficha**: "+ tag" no artigo, em cada campo e em cada citação. O autocompletar sugere as tags do projeto (tema › subtema), e Enter cria a tag que não existe. Um contexto compartilhado faz a tag criada num campo aparecer na hora nos outros.
- **Temas** (`/projects/[id]/temas`):
  - Lista em árvore com contagem de trechos e de artigos. Dá para criar, editar (nome, cor, tema, descrição), juntar e excluir; a confirmação mostra quantas marcações saem.
  - A visão de um tema inclui os subtemas e agrupa por artigo, em ordem de autor e ano.
  - Cada trecho aparece com a chamada ABNT e link para o visualizador.
- **Filtros**:
  - Lista de artigos: o tema inclui os subtemas.
  - Matriz: `?tema=`.
  - Exportação do projeto: `&tema=`.
  - O Excel e o CSV ganham a coluna "Tags".
- **Exportar um tema**: Excel e Markdown (`/api/export/[projectId]/tema/[tagId]`), e "Copiar" põe o Markdown na área de transferência.
- **Backup**: versão 5, com `tags` e `taggings`.
