# PEO (e PCC)

**Status da doc**: rascunho
**Usado em**: spec 007 (modelos de campos)
**Atualizado**: 2026-11-14

## PEO

### O que é

PEO é uma estrutura de pergunta para estudos de **exposição, etiologia e risco**, em que não há intervenção aplicada pelo pesquisador: os participantes estão expostos a algo (um fator de risco, uma condição, um ambiente) e observa-se o desfecho. É usada em revisões de estudos observacionais (coorte, caso-controle, transversal) e no Manual JBI para revisões de etiologia e risco.

### Componentes

| Letra | Componente | Pergunta que responde | Exemplo |
|---|---|---|---|
| **P** | Population | Quem são os participantes? | Trabalhadores rurais |
| **E** | Exposure | A que estão expostos? | Agrotóxicos organofosforados |
| **O** | Outcome | Que desfecho é observado? | Depressão |

Exemplo de pergunta: "Em trabalhadores rurais (P), a exposição a organofosforados (E) está associada a depressão (O)?"

### Campos no Fichamento (modelo PEO, spec 007)

| Chave | Nome | Definição para o extrator |
|---|---|---|
| `population` | População | Quem foram os participantes: número, perfil, local, período. |
| `exposure` | Exposição | O fator de exposição, como foi medido e em que níveis. |
| `outcome` | Desfecho | O desfecho observado, como foi medido e a medida de associação relatada (OR, RR, HR) com intervalo de confiança. |
| `confounders` | Fatores de confusão | Variáveis de ajuste declaradas pelos autores (opcional). |

## PCC

### O que é

PCC é a estrutura recomendada pelo JBI para **revisões de escopo** (scoping reviews), que mapeiam o que existe sobre um tema em vez de responder a uma pergunta de efeito. É mais ampla que PICO e não exige desfecho nem comparação.

### Componentes

| Letra | Componente | Pergunta que responde | Exemplo |
|---|---|---|---|
| **P** | Population | Quem? | Estudantes de graduação |
| **C** | Concept | Qual o conceito, fenômeno ou intervenção mapeado? | Uso de IA generativa na escrita acadêmica |
| **C** | Context | Em que contexto (local, cultura, área)? | Universidades da América Latina |

### Campos no Fichamento (modelo PCC, spec 007)

| Chave | Nome | Definição para o extrator |
|---|---|---|
| `population` | População | Participantes ou objeto do estudo. |
| `concept` | Conceito | O conceito central abordado e como o artigo o trata. |
| `context` | Contexto | País, ambiente, área e período do estudo. |

## Cobertura no Fichamento

| Item | Status |
|---|---|
| PEO: campo P | ⬜ |
| PEO: campo E | ⬜ |
| PEO: campo O (com medida de associação) | ⬜ |
| PEO: fatores de confusão (opcional) | ⬜ |
| PCC: campo População | ⬜ |
| PCC: campo Conceito | ⬜ |
| PCC: campo Contexto | ⬜ |

## Licença

Estruturas conceituais, sem restrição de uso.

## Referências

- Moola S, Munn Z, Sears K et al. Conducting systematic reviews of association (etiology): The Joanna Briggs Institute's approach. *International Journal of Evidence-Based Healthcare*. 2015;13(3):163–169.
- Aromataris E, Lockwood C, Porritt K, Pilla B, Jordan Z (eds.). *JBI Manual for Evidence Synthesis*. JBI, 2024. https://jbi-global-wiki.refined.site/space/MANUAL
- Peters MDJ et al. Updated methodological guidance for the conduct of scoping reviews. *JBI Evidence Synthesis*. 2020;18(10):2119–2126.
