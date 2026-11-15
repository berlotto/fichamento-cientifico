# SPIDER

**Status da doc**: rascunho
**Usado em**: spec 007 (modelos de campos)
**Atualizado**: 2026-11-14

## O que é

SPIDER é uma estrutura para formular perguntas e buscas em **pesquisa qualitativa e de métodos mistos**, proposta por Cooke, Smith e Booth (2012) como alternativa ao PICO, que não se ajusta bem a estudos sem intervenção e comparação. Troca "intervenção" por "fenômeno de interesse" e acrescenta o desenho e o tipo de pesquisa, que ajudam a filtrar estudos qualitativos nas bases.

## Componentes

| Letra | Componente | Pergunta que responde | Exemplo |
|---|---|---|---|
| **S** | Sample | Quem participou? (amostra, não "população": a pesquisa qualitativa não busca generalizar) | Enfermeiras de UTI |
| **PI** | Phenomenon of Interest | Que experiência, comportamento ou decisão se estuda? | Experiência de cuidar de pacientes em fim de vida |
| **D** | Design | Como os dados foram coletados? | Entrevistas semiestruturadas, grupos focais |
| **E** | Evaluation | O que foi avaliado? (desfechos subjetivos) | Percepções, sentimentos, atitudes |
| **R** | Research type | Tipo de pesquisa | Qualitativa, mista |

## Evidência sobre o uso

Methley e colegas (2014) compararam PICO, PICOS e SPIDER em buscas de estudos qualitativos: o SPIDER foi mais **específico** (menos resultados irrelevantes) e menos **sensível** (perdeu estudos relevantes). Para revisões sistemáticas completas, os autores recomendam PICO modificado ou combinar estratégias; o SPIDER serve quando o tempo é curto.

## Campos no Fichamento (modelo SPIDER, spec 007)

| Chave | Nome | Definição para o extrator |
|---|---|---|
| `sample` | Amostra | Quem participou: número, perfil, como foram recrutados, local. |
| `phenomenon` | Fenômeno de interesse | A experiência, percepção, comportamento ou decisão estudada. |
| `design` | Desenho | Como os dados foram coletados (entrevista, grupo focal, observação, documentos) e o referencial metodológico (fenomenologia, teoria fundamentada, etnografia). |
| `evaluation` | Avaliação | O que foi analisado e os principais achados/temas. |
| `research_type` | Tipo de pesquisa | Qualitativa ou mista, como declarado pelos autores. |

## Cobertura no Fichamento

| Item | Status |
|---|---|
| Campo S (amostra) | ⬜ |
| Campo PI (fenômeno de interesse) | ⬜ |
| Campo D (desenho) | ⬜ |
| Campo E (avaliação) | ⬜ |
| Campo R (tipo de pesquisa) | ⬜ |

## Licença

Estrutura conceitual, sem restrição de uso.

## Referências

- Cooke A, Smith D, Booth A. Beyond PICO: the SPIDER tool for qualitative evidence synthesis. *Qualitative Health Research*. 2012;22(10):1435–1443. doi:10.1177/1049732312452938
- Methley AM, Campbell S, Chew-Graham C, McNally R, Cheraghi-Sohi S. PICO, PICOS and SPIDER: a comparison study of specificity and sensitivity in three search tools for qualitative systematic reviews. *BMC Health Services Research*. 2014;14:579. doi:10.1186/s12913-014-0579-0
