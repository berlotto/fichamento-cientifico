# 3.2 Fluxograma PRISMA 2020

**Spec**: 009_fluxograma-prisma.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Toda revisão sistemática publicada apresenta o fluxograma PRISMA 2020: quantos registros foram identificados, removidos antes da triagem, triados, excluídos, buscados, avaliados e incluídos, com os motivos de exclusão no texto completo. Montar à mão é trabalhoso e a contagem costuma dar errado. Ver `docs/prisma-2020.md`.

## Descrição

1. Com a triagem (spec 008) ligada, o projeto ganha a página "PRISMA", que monta o fluxograma a partir das decisões registradas.
2. Caixas da versão para revisões novas, com bases e registros:
   - **Identificação:** registros por fonte (cada importação informa a base); removidos antes da triagem (duplicatas, marcados por automação, outros motivos).
   - **Triagem:** registros triados; excluídos; relatórios buscados; não obtidos; avaliados para elegibilidade; excluídos por motivo (com n por motivo).
   - **Incluídos:** estudos incluídos; relatórios dos estudos incluídos.
3. Coluna opcional "outros métodos" (sites, organizações, busca por citação, spec 012).
4. Exportar em SVG e PNG, e as contagens em CSV.
5. O pesquisador pode corrigir um número à mão (ex.: busca manual fora do sistema), e a correção fica marcada.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Fonte de cada registro guardada na importação (base, data da busca) | ⬜ |
| R2 | Cálculo das contagens a partir de `screening_decisions` (função SQL) | ⬜ |
| R3 | Desenho do fluxograma (versão revisões novas: bases e registros) | ⬜ |
| R4 | Coluna "outros métodos" | ⬜ |
| R5 | Exportação SVG/PNG/CSV | ⬜ |
| R6 | Ajuste manual de contagens, com marca visível | ⬜ |
| R7 | Textos das caixas em português e inglês (idioma escolhido) | ⬜ |

## Critérios de Aceite

- [ ] Para cada caixa, a soma confere: identificados − removidos = triados; triados − excluídos = buscados; e assim por diante
- [ ] A soma dos motivos de exclusão é igual ao total de excluídos no texto completo
- [ ] O SVG exportado abre em Word e Inkscape sem perder texto
- [ ] Um número ajustado à mão aparece com marca no app (não no export)

## Fora do Escopo

- Versão para atualização de revisão (com estudos da versão anterior)
- Checklist PRISMA de 27 itens para o manuscrito (pode virar spec própria; ver `docs/prisma-2020.md`)

## Notas Técnicas

- Desenhar em SVG no servidor (sem biblioteca de diagrama) para o export ser idêntico ao da tela.
- "Relatórios" e "estudos" são diferentes no PRISMA 2020: um estudo pode ter vários relatórios (artigos). Se o modelo de dados não distinguir, estudos = relatórios e isso deve ficar dito na página.

## Dependências

- Depende de: 008 (triagem).
- Usa: 012 (busca por citação), 014 (duplicatas).

## Perguntas em aberto

1. Distinguir estudo e relatório agora ou tratar como iguais na primeira versão?
2. Incluir o checklist de 27 itens do PRISMA como ajuda para a escrita?
