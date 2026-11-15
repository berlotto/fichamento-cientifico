# 5.1 Ficha formatada em Word e PDF (ABNT)

**Spec**: 015_ficha-word-pdf.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Muitos programas de pós-graduação e disciplinas pedem o fichamento como entrega, em formato próximo da ABNT: referência completa no topo, citações diretas com página, resumo e comentário. Hoje o Fichamento exporta a matriz (xlsx, CSV) e as referências (BibTeX, ABNT), mas não a ficha de um artigo como documento. Ver `docs/fichamento-abnt.md`.

## Descrição

1. Na ficha e na lista (seleção de vários artigos), ação "Baixar ficha" em .docx ou PDF.
2. Conteúdo, nesta ordem:
   - Cabeçalho: referência completa na norma do projeto (NBR 6023:2018 por padrão).
   - Fichamento de conteúdo: campos revisados (resumo, objetivo, método, resultados, conclusões, personalizados), cada um com a citação indireta (AUTOR, ano).
   - Fichamento de citação: citações à mão (spec 002) e trechos dos campos, entre aspas, com (AUTOR, ano, p. X).
   - Análise crítica (spec 001).
   - Tags (spec 003), se houver.
3. Opções: incluir ou não campos a revisar (com selo), idioma dos rótulos, fonte (das fontes configuráveis), modelo "uma ficha por página" para vários artigos.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Geração de .docx no servidor | ⬜ |
| R2 | Geração de PDF no servidor | ⬜ |
| R3 | Cabeçalho com referência pela norma do projeto (`lib/citation.ts`) | ⬜ |
| R4 | Seções de conteúdo, citação e análise crítica | ⬜ |
| R5 | Citações diretas no formato da NBR 10520:2023 (até 3 linhas no texto; mais de 3 em recuo de 4 cm, fonte menor, sem aspas) | ⬜ |
| R6 | Exportação de vários artigos num arquivo só | ⬜ |
| R7 | Opções (campos a revisar, idioma, fonte) | ⬜ |

## Critérios de Aceite

- [ ] O .docx abre no Word e no LibreOffice sem aviso de reparo
- [ ] Citação direta longa sai em bloco recuado; curta, entre aspas no parágrafo
- [ ] Campo não revisado só entra com a opção ligada, e com selo "a revisar"
- [ ] 50 artigos num arquivo geram em menos de 30 s

## Fora do Escopo

- Edição do documento dentro do app
- Modelos de documento por universidade

## Notas Técnicas

- O xlsx já é gerado à mão com `fflate`; o .docx é OOXML parecido e pode seguir o mesmo caminho, ou usar a biblioteca `docx`. Avaliar tamanho no bundle da função.
- PDF: renderizar HTML para PDF no servidor exige navegador headless (pesado na Vercel). Alternativa: biblioteca de PDF em JS (ex.: `pdf-lib`, `@react-pdf/renderer`). Decidir antes de começar.
- Conferir em `docs/fichamento-abnt.md` as regras da NBR 10520:2023, que mudaram em relação à de 2002.

## Dependências

- Usa: 001, 002, 003 (quando existirem; sem elas, as seções somem).

## Perguntas em aberto

1. Word e PDF, ou só Word (o pesquisador converte)?
2. Algum modelo de ficha da sua universidade para servir de referência?
