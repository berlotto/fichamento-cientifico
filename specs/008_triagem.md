# 3.1 Triagem por critérios de elegibilidade

**Spec**: 008_triagem.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Numa revisão sistemática, antes de fichar, o pesquisador faz a triagem: decide quais estudos entram, primeiro por título e resumo e depois pelo texto completo, aplicando critérios de inclusão e exclusão definidos no protocolo. Cada exclusão no texto completo precisa de motivo, porque o PRISMA 2020 (item 16b e fluxograma) pede a contagem por motivo. Covidence e Rayyan são as ferramentas de referência para isso.

Hoje o Fichamento parte do PDF já escolhido e faz a ficha completa, o que é caro para artigos que serão descartados.

## Descrição

1. O projeto pode ligar o **modo revisão sistemática**, que ativa a triagem.
2. O pesquisador cadastra **critérios de inclusão e exclusão** (texto) e uma lista de **motivos de exclusão**.
3. **Etapa 1, título e resumo:** o artigo entra por metadados (título, resumo), sem PDF. O LLM sugere incluir/excluir/incerto com justificativa ligada ao critério; o pesquisador decide.
4. **Etapa 2, texto completo:** com o PDF, o LLM sugere de novo, com trecho e página; o pesquisador decide e, ao excluir, escolhe o motivo.
5. Só artigos incluídos seguem para a extração completa.
6. Todas as decisões ficam registradas (quem, quando, sugestão do LLM, decisão final) para o PRISMA (spec 009).

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Modo revisão sistemática por projeto | ⬜ |
| R2 | Cadastro de critérios de inclusão/exclusão e de motivos de exclusão | ⬜ |
| R3 | Importação de registros só com metadados (lista de DOIs, RIS, BibTeX) para a etapa 1 | ⬜ |
| R4 | Sugestão do LLM na etapa 1 (modelo barato, só título e resumo), com justificativa | ⬜ |
| R5 | Tela de triagem rápida (atalhos de teclado: incluir, excluir, talvez) | ⬜ |
| R6 | Etapa 2 com PDF: sugestão com trecho e página, decisão com motivo obrigatório na exclusão | ⬜ |
| R7 | Registro de cada decisão (tabela `screening_decisions`) | ⬜ |
| R8 | Extração completa só para incluídos | ⬜ |
| R9 | Remoção de duplicatas antes da triagem (usa spec 014) | ⬜ |

## Critérios de Aceite

- [ ] O LLM nunca exclui sozinho: toda decisão final é humana
- [ ] Excluir na etapa 2 sem motivo não é possível
- [ ] A sugestão do LLM e a decisão humana ficam gravadas separadas (permite medir concordância)
- [ ] Artigo excluído não gasta extração completa
- [ ] As contagens batem com o fluxograma da spec 009

## Fora do Escopo

- Revisores múltiplos (agentes, spec 011; humanos, spec 017) e resolução de divergências
- Busca nas bases (PubMed, Scopus); a importação parte de arquivos exportados delas
- Priorização por aprendizado ativo (ordenar pelo mais provável de inclusão)

## Fluxo do Usuário

1. Cria projeto em modo revisão sistemática e escreve os critérios.
2. Importa o RIS exportado do Scopus (850 registros); duplicatas são marcadas.
3. Triagem por título/resumo com o LLM sugerindo; decide 850 em sequência com atalhos.
4. Sobe os PDFs dos 60 incluídos; triagem de texto completo; exclui 22 com motivo.
5. Os 38 incluídos seguem para a ficha.

## Notas Técnicas

- Artigo sem PDF muda o modelo atual (`articles.storage_path not null`, `sha256 not null`). Precisa de um registro de "estudo/referência" separado do PDF, ou tornar essas colunas anuláveis. Decisão de modelagem importante: afeta 009, 011 e 014.
- Custo da etapa 1: só título e resumo num modelo barato; ainda assim, 850 registros contam no limite do usuário.
- A importação de RIS reaproveita o parser da spec 016.

## Dependências

- Bloqueia: 009 (PRISMA).
- Usa: 014 (duplicatas), 016 (parser RIS).
- Relacionada a 004 ("descartado") e 011 (revisores múltiplos), 017 (equipe humana), 018 (declaração de IA).

## Perguntas em aberto

1. O público-alvo inclui revisões sistemáticas de fato? Se não, esta spec e as 009 e 010 podem esperar.
2. Registro sem PDF: nova tabela `records` ou `articles` com PDF opcional?
3. Sugestão do LLM na etapa 1 por padrão, ou o pesquisador liga?
