# 1.3 Tags e temas

**Spec**: 003_tags-temas.md
**Status**: draft
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
| R1 | Tabelas `tags` (por projeto, com `parent_id`) e `taggings` (alvo polimórfico: artigo, campo, citação) com RLS | ⬜ |
| R2 | Criar, renomear, mudar cor, juntar duas tags e excluir | ⬜ |
| R3 | Aplicar e remover tag em artigo, campo e citação, com autocompletar | ⬜ |
| R4 | Página "Temas" com contagem por tag | ⬜ |
| R5 | Visão de uma tag: trechos agrupados por artigo, com link para o visualizador | ⬜ |
| R6 | Filtro por tag na lista de artigos e na matriz | ⬜ |
| R7 | Exportar uma tag em xlsx e Markdown | ⬜ |
| R8 | Limite de tags por projeto | ⬜ |

## Critérios de Aceite

- [ ] Juntar a tag A na B move todas as marcações de A para B e apaga A
- [ ] Excluir uma tag pede confirmação e mostra quantas marcações serão removidas
- [ ] Excluir um artigo remove as marcações dele
- [ ] Uma tag de um projeto não aparece em outro
- [ ] A visão da tag mostra cada trecho com (AUTOR, ano, p.)

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

## Perguntas em aberto

1. Hierarquia de um nível basta?
2. Tag em comentário do pesquisador (spec 001) faz sentido?
3. Quer a sugestão de tags pelo LLM já nesta spec ou depois?
