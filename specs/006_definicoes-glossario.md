# 2.2 Definições e glossário do projeto

**Spec**: 006_definicoes-glossario.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

O referencial teórico de uma tese depende de mostrar como cada autor define os conceitos centrais ("resiliência", "letramento digital"), e onde as definições divergem. Hoje essa informação fica espalhada no texto e só sai por citação à mão.

## Descrição

1. O projeto tem uma lista de **conceitos de interesse** (ex.: "resiliência", "adesão ao tratamento").
2. Na extração, o LLM procura definições explícitas desses conceitos no artigo: termo, definição literal, página, e se é definição do próprio autor ou citada de outro (com a referência citada, quando houver).
3. Uma página "Glossário" do projeto agrupa por conceito todas as definições encontradas, com (AUTOR, ano, p.).
4. O pesquisador pode adicionar uma definição à mão a partir de uma citação (spec 002).

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Lista de conceitos por projeto (tabela `concepts`) com limite | ⬜ |
| R2 | Estágio ou parte do prompt que extrai definições só dos conceitos listados | ⬜ |
| R3 | Tabela `definitions` (concept_id, article_id, quote, pdf_page, printed_page, origin: próprio/citado, cited_ref) | ⬜ |
| R4 | Verificação do trecho com `verify.ts` e revisão humana (aceitar/rejeitar) | ⬜ |
| R5 | Página "Glossário" agrupada por conceito | ⬜ |
| R6 | Transformar uma citação à mão em definição | ⬜ |
| R7 | Exportar o glossário (xlsx e Markdown) | ⬜ |

## Critérios de Aceite

- [ ] Só aparecem definições de conceitos cadastrados
- [ ] Definição citada de outro autor vem marcada como "citada" e com a referência original quando o artigo a traz
- [ ] Adicionar um conceito novo permite reprocessar só essa busca, sem refazer a ficha toda
- [ ] Nenhuma definição sem trecho localizado no PDF fica como verificada

## Fora do Escopo

- Descobrir conceitos automaticamente
- Comparar definições com LLM (ver 013)

## Notas Técnicas

- Rodar como estágio separado (`definitions`) evita reextrair a ficha quando a lista de conceitos muda. Custo: uma chamada a mais por artigo; avaliar se compensa juntar no `extract`.
- Um artigo pode ter várias definições do mesmo conceito: não usar chave única (article, concept).

## Dependências

- Usa: 002 (citações), pipeline de extração.
- Relacionada a 013.

## Perguntas em aberto

1. Estágio separado (mais caro, mais flexível) ou junto da extração?
2. Precisa distinguir "definição" de "operacionalização" (como o conceito foi medido)?
