# 1.1 Comentário crítico

**Spec**: 001_comentario-critico.md
**Status**: done (aguardando validação do usuário)
**Data**: 2026-11-14

## Contexto

O fichamento clássico tem três partes: bibliográfica, de citação e de conteúdo/crítica. As duas primeiras o Fichamento já cobre (metadados via Crossref, campos com trecho e página). A terceira é o que o pesquisador pensa do texto, e hoje se resume ao campo livre "Minhas notas" (`articles.notes`, até 20 000 caracteres), sem ligação com os campos, fora da matriz e fora dos exports.

O comentário crítico é o que o pesquisador mais reaproveita ao escrever: concordo ou discordo, onde o método é frágil, como isso se liga à minha pergunta de pesquisa. Ele tem que ficar visualmente separado do que o LLM extraiu, para nunca se confundir com o que o autor do artigo disse.

## Descrição

1. **Comentário por campo:** cada campo da ficha (fixos e personalizados) ganha um comentário opcional do pesquisador, editável na própria ficha.
2. **Comentário geral estruturado:** o "Minhas notas" vira uma seção "Análise crítica" com subcampos opcionais: *pontos fortes*, *pontos fracos*, *relação com minha pesquisa* e *notas livres*. O que já existe em `notes` migra para *notas livres*.
3. **Visual distinto:** comentário do pesquisador sempre com rótulo e estilo próprios ("Meu comentário"), nunca com o selo de trecho/página.
4. **Saídas:** a matriz e os exports (xlsx, CSV) ganham colunas opcionais de comentário. A ficha em Word/PDF (spec 015) inclui a análise crítica.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Tabela/colunas para comentário por campo, com RLS por dono do artigo | ✅ |
| R2 | Edição do comentário por campo na ficha, salvando ao sair do campo (como `notes-field.tsx`) | ✅ |
| R3 | Seção "Análise crítica" com os 4 subcampos | ✅ |
| R4 | Migração de `articles.notes` para "notas livres" sem perda | ✅ |
| R5 | Estilo visual distinto do conteúdo extraído, nos temas claro e escuro | ✅ |
| R6 | Colunas opcionais de comentário na matriz e nos exports xlsx/CSV | ✅ |
| R7 | "Extrair de novo" não apaga comentários | ✅ |

## Critérios de Aceite

- [x] Comentário de um campo aparece só para o dono do artigo (teste de RLS com dois usuários)
- [x] Reextrair o artigo mantém todos os comentários
- [x] Notas antigas aparecem em "notas livres" depois da migração
- [x] Na matriz, com a opção ligada, cada célula mostra o comentário separado do valor extraído
- [x] No CSV, comentários passam pela mesma neutralização de fórmulas que os demais campos

## Fora do Escopo

- Comentários de outras pessoas e conversas (spec 017)
- Comentário preso a um trecho do PDF (vira citação à mão, spec 002)
- Uso do comentário pelo LLM (síntese, F3.3)

## Fluxo do Usuário

1. Abre a ficha do artigo.
2. Em um campo (ex.: Método), clica em "Comentar" e escreve "amostra pequena, só um hospital".
3. Sai do campo; aparece "Salvo".
4. No fim da ficha, preenche "Pontos fracos" e "Relação com minha pesquisa".
5. Na matriz, liga "mostrar meus comentários" e vê a coluna ao lado de Método.

## Notas Técnicas

- Hoje `article_fields` não aceita `insert/update` do usuário (só o worker grava). O comentário deve ficar numa tabela própria (`field_comments(article_id, field_key, body, updated_at)`) ou numa coluna com `grant update (comment)` específico. A tabela própria é mais limpa e sobrevive à reextração.
- Limite de tamanho por comentário (sugestão: 5 000 caracteres), na mesma linha do limite de `notes`.
- O comentário é texto do usuário: escapar na UI e no export, como já se faz com o resto.

## Dependências

- Base para 015 (ficha Word/PDF) e 016 (Markdown).
- Relacionada a 003 (tags podem ser aplicadas a comentários? ver perguntas).

## Decisões tomadas na implementação (2026-11-14)

1. Subcampos: Pontos fortes, Pontos fracos, Relação com minha pesquisa, Notas livres (o antigo "Minhas notas"; nada migrado, a coluna `articles.notes` foi mantida).
2. Comentário em texto puro (até 5 000 caracteres por campo; 10 000 por parte da análise).
3. Tags em comentários ficam para a spec 003.
4. Na exportação, a análise crítica é opcional ("Incluir minha análise crítica"), desligada por padrão, e entra no backup JSON (versão 3).

Implementação: migração `20261114000000_critical_comments.sql` (tabela `field_comments` com RLS, colunas `crit_*`), `critique.tsx`, `FieldComment` em `field-review.tsx`, matriz com "Meus comentários", `ExportLinks`. Testes: `tests/integration/critique.int.test.ts`, `lib/export/project-table.test.ts`.

## Perguntas em aberto (respondidas)

1. Os quatro subcampos da análise crítica servem, ou prefere outros (ex.: "citar em qual capítulo")?
2. Comentário por campo deve aceitar formatação (negrito, lista) ou texto puro basta?
3. Tags (spec 003) podem ser aplicadas ao comentário, ou só a trechos do artigo?
