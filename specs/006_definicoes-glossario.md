# 2.2 Definições e glossário do projeto

**Spec**: 006_definicoes-glossario.md
**Status**: done (aguardando validação do usuário)
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
| R1 | Lista de conceitos por projeto (tabela `concepts`) com limite | ✅ |
| R2 | Estágio ou parte do prompt que extrai definições só dos conceitos listados | ✅ |
| R3 | Tabela `definitions` (concept_id, article_id, quote, pdf_page, printed_page, origin: próprio/citado, cited_ref) | ✅ |
| R4 | Verificação do trecho com `verify.ts` e revisão humana (aceitar/rejeitar) | ✅ |
| R5 | Página "Glossário" agrupada por conceito | ✅ |
| R6 | Transformar uma citação à mão em definição | ✅ |
| R7 | Exportar o glossário (xlsx e Markdown) | ✅ |

## Critérios de Aceite

- [x] Só aparecem definições de conceitos cadastrados
- [x] Definição citada de outro autor vem marcada como "citada" e com a referência original quando o artigo a traz
- [x] Adicionar um conceito novo permite reprocessar só essa busca, sem refazer a ficha toda
- [x] Nenhuma definição sem trecho localizado no PDF fica como verificada

## Fora do Escopo

- Descobrir conceitos automaticamente
- Comparar definições com LLM (ver 013)

## Notas Técnicas

- Rodar como estágio separado (`definitions`) evita reextrair a ficha quando a lista de conceitos muda. Custo: uma chamada a mais por artigo; avaliar se compensa juntar no `extract`.
- Um artigo pode ter várias definições do mesmo conceito: não usar chave única (article, concept).

## Dependências

- Usa: 002 (citações), pipeline de extração.
- Relacionada a 013.

## Perguntas em aberto (respondidas na implementação)

1. ~~Separado ou junto?~~ Estágio separado `definitions`: roda depois da extração quando o projeto tem conceitos, e sob pedido em "Buscar definições nos artigos".
2. ~~Definição ou operacionalização?~~ Sim: o campo `kind` guarda essa diferença.

## Decisões tomadas na implementação (2026-11-17)

- **Banco** (`20261117000000_optional_fields_glossary.sql`):
  - `concepts`: até 30 por projeto, nome único sem diferenciar maiúsculas.
  - `definitions`: trecho literal com tradução, página, origem (dos autores ou citada) e a referência citada, tipo (definição ou operacionalização), se o trecho foi conferido, revisão (pendente, aceita, rejeitada), fonte (LLM ou à mão) e a citação de origem.
  - Um trigger garante conceito e artigo no mesmo projeto. Depois de gravada, só revisão, origem, referência e tipo mudam.
- **Estágio `definitions`**:
  - A busca nova não refaz a ficha. Ela regrava só as definições pendentes vindas do LLM e não repete as já revisadas nem as marcadas à mão.
  - O conceito devolvido pelo modelo precisa casar com a lista; outros são descartados. O trecho é conferido no texto do PDF.
- **Estágio auxiliar**: se a busca falhar, o erro vai só para o log. O artigo não vira "falhou" nem mostra erro na ficha.
- **`request_definitions`**: põe na fila um artigo por vez (sem os descartados) e respeita o teto de gasto.
- **Glossário** (`/projects/[id]/glossario`):
  - Conceitos com nota, e cada definição com a chamada "(Silva, 2023, p. 4)". Citada vira "(Masten, 2001 apud Silva, 2023, p. 4)".
  - Selos de tipo e origem, "trecho conferido", tradução, aceitar e rejeitar (as rejeitadas ficam escondidas).
  - Exporta em Excel e Markdown.
- **Citação → definição**: "Usar como definição no glossário" no cartão da citação. Ela nasce conferida e aceita.
- **Teste com o modelo** (gpt-5-mini, texto de exemplo): achou a definição citada (Masten, 2001), com o trecho conferido, e a operacionalização (escala CD-RISC).
