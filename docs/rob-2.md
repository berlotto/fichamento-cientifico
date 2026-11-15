# RoB 2 (Cochrane Risk of Bias tool, versão 2)

**Status da doc**: conferida com a ficha resumida oficial (*RoB 2 short version, cribsheet*), baixada em 2026-11-14 da página oficial (sites.google.com/site/riskofbiastool). As variantes cluster e crossover não foram transcritas.
**Usado em**: spec 010
**Licença**: CC BY-NC-ND 4.0 (não comercial, sem derivados). Ver seção Licença.
**Atualizado**: 2026-11-14

## O que é

O RoB 2 é a ferramenta da Cochrane para avaliar o **risco de viés em ensaios clínicos randomizados**. Substituiu a ferramenta de 2011 e é a recomendada pelo *Cochrane Handbook*.

- **Avalia um resultado, não o estudo.** Cada resultado numérico de um desfecho recebe sua própria avaliação.
- **Depende do efeito de interesse:** *efeito da atribuição à intervenção* (intenção de tratar) ou *efeito de aderir à intervenção* (por protocolo). O domínio 2 tem uma versão para cada.
- **Perguntas de sinalização** com respostas padronizadas levam, por um **algoritmo**, ao julgamento proposto em cada domínio. Quem avalia pode discordar do algoritmo, desde que justifique.

Variantes oficiais: ensaio paralelo com randomização individual (transcrita aqui), ensaio randomizado por conglomerado (cluster) e ensaio cruzado (crossover).

## Considerações preliminares (antes dos domínios)

- Desenho do estudo: paralelo individual / cluster / crossover.
- Comparação: intervenção experimental e comparador.
- Resultado numérico avaliado e desfecho.
- **Efeito de interesse**: atribuição (*intention-to-treat*) ou adesão (*per-protocol*). Para adesão, indicar quais desvios entram (pelo menos um): cointervenções importantes fora do protocolo, falhas na implementação, não adesão ao regime atribuído.
- Fontes consultadas: artigo, protocolo, registro do ensaio, etc.

## Respostas e julgamentos

- **Respostas:** Y (Yes), PY (Probably yes), PN (Probably no), N (No), NI (No information). NA quando a pergunta é condicional e não foi acionada.
- **Julgamento por domínio:** Low risk · Some concerns · High risk.
- **Direção do viés** (opcional, por domínio e geral): NA, Favours experimental, Favours comparator, Towards null, Away from null, Unpredictable.

## Domínio 1: Processo de randomização

| Nº | Pergunta (original) | Tradução | Respostas |
|---|---|---|---|
| 1.1 | Was the allocation sequence random? | A sequência de alocação foi aleatória? | Y/PY/PN/N/NI |
| 1.2 | Was the allocation sequence concealed until participants were enrolled and assigned to interventions? | A sequência foi ocultada até a inclusão e alocação? | Y/PY/PN/N/NI |
| 1.3 | Did baseline differences between intervention groups suggest a problem with the randomization process? | Diferenças na linha de base sugerem problema na randomização? | Y/PY/PN/N/NI |

**Algoritmo:**
- 1.2 = **N/PN** → **High**.
- 1.2 = **Y/PY**:
  - 1.1 = N/PN → **Some concerns**.
  - 1.1 = Y/PY/NI e 1.3 = N/PN/NI → **Low**.
  - 1.1 = Y/PY/NI e 1.3 = Y/PY → **Some concerns**.
- 1.2 = **NI**:
  - 1.3 = N/PN/NI → **Some concerns**.
  - 1.3 = Y/PY → **High**.

## Domínio 2: Desvios das intervenções pretendidas (efeito da atribuição)

| Nº | Pergunta (original) | Tradução | Quando | Respostas |
|---|---|---|---|---|
| 2.1 | Were participants aware of their assigned intervention during the trial? | Participantes sabiam da intervenção atribuída? | sempre | Y/PY/PN/N/NI |
| 2.2 | Were carers and people delivering the interventions aware of participants' assigned intervention during the trial? | Cuidadores e aplicadores sabiam? | sempre | Y/PY/PN/N/NI |
| 2.3 | Were there deviations from the intended intervention that arose because of the trial context? | Houve desvios decorrentes do contexto do ensaio? | se Y/PY/NI em 2.1 ou 2.2 | NA/Y/PY/PN/N/NI |
| 2.4 | Were these deviations likely to have affected the outcome? | Esses desvios provavelmente afetaram o desfecho? | se Y/PY em 2.3 | NA/Y/PY/PN/N/NI |
| 2.5 | Were these deviations from intended intervention balanced between groups? | Os desvios estavam equilibrados entre os grupos? | se Y/PY/NI em 2.4 | NA/Y/PY/PN/N/NI |
| 2.6 | Was an appropriate analysis used to estimate the effect of assignment to intervention? | Análise adequada para o efeito da atribuição? | sempre | Y/PY/PN/N/NI |
| 2.7 | Was there potential for a substantial impact (on the result) of the failure to analyse participants in the group to which they were randomized? | Potencial de impacto substancial por não analisar no grupo randomizado? | se N/PN/NI em 2.6 | NA/Y/PY/PN/N/NI |

Nota oficial (2.6): análises ITT e ITT modificada que excluem participantes sem dados do desfecho são adequadas. Análises "por protocolo" ingênuas e "como tratado" não são.

**Algoritmo em duas partes:**
- **Parte 1 (2.1–2.5):**
  - 2.1 e 2.2 ambas N/PN → Low.
  - Se qualquer uma for Y/PY/NI, ir para 2.3:
    - 2.3 = N/PN → Low.
    - 2.3 = NI → Some concerns.
    - 2.3 = Y/PY → ir para 2.4:
      - 2.4 = N/PN → Some concerns.
      - 2.4 = Y/PY/NI → ir para 2.5: Y/PY → Some concerns; N/PN/NI → High.
- **Parte 2 (2.6–2.7):**
  - 2.6 = Y/PY → Low.
  - 2.6 = N/PN/NI → ir para 2.7: N/PN → Some concerns; Y/PY/NI → High.
- **Domínio:**
  - Low nas duas partes → **Low**.
  - Some concerns em alguma parte, sem High → **Some concerns**.
  - High em qualquer parte → **High**.

## Domínio 2 (alternativo): Desvios das intervenções pretendidas (efeito da adesão)

| Nº | Pergunta (original) | Tradução | Quando |
|---|---|---|---|
| 2.1 | Were participants aware of their assigned intervention during the trial? | Participantes sabiam? | sempre |
| 2.2 | Were carers and people delivering the interventions aware of participants' assigned intervention during the trial? | Cuidadores e aplicadores sabiam? | sempre |
| 2.3 | [If applicable] Were important non-protocol interventions balanced across intervention groups? | Cointervenções fora do protocolo estavam equilibradas? | se aplicável e Y/PY/NI em 2.1 ou 2.2 |
| 2.4 | [If applicable] Were there failures in implementing the intervention that could have affected the outcome? | Houve falhas de implementação que poderiam afetar o desfecho? | se aplicável |
| 2.5 | [If applicable] Was there non-adherence to the assigned intervention regimen that could have affected participants' outcomes? | Houve não adesão que poderia afetar o desfecho? | se aplicável |
| 2.6 | Was an appropriate analysis used to estimate the effect of adhering to the intervention? | Análise adequada para o efeito da adesão? | se N/PN/NI em 2.3, ou Y/PY/NI em 2.4 ou 2.5 |

"Se aplicável" significa que a pergunta só entra se o desvio correspondente foi marcado nas considerações preliminares. Nota oficial: análises "por protocolo" ingênuas e "como tratado" costumam ser inadequadas para o efeito da adesão. Métodos adequados incluem variável instrumental e ponderação pelo inverso da probabilidade.

**Algoritmo:**
1. 2.1 e 2.2 ambas N/PN → ir para 2.4/2.5. Se qualquer uma for Y/PY/NI → ir para 2.3.
2. 2.3:
   - NA/Y/PY → ir para 2.4/2.5.
   - N/PN/NI → ir para 2.6.
3. 2.4 e 2.5:
   - Ambas NA/N/PN → **Low**.
   - Qualquer uma Y/PY/NI → ir para 2.6.
4. 2.6: Y/PY → **Some concerns**; N/PN/NI → **High**.

## Domínio 3: Dados de desfecho ausentes

| Nº | Pergunta (original) | Tradução | Quando | Respostas |
|---|---|---|---|---|
| 3.1 | Were data for this outcome available for all, or nearly all, participants randomized? | Dados disponíveis para todos ou quase todos? | sempre | Y/PY/PN/N/NI |
| 3.2 | Is there evidence that the result was not biased by missing outcome data? | Há evidência de que o resultado não foi enviesado? | se N/PN/NI em 3.1 | NA/Y/PY/PN/N |
| 3.3 | Could missingness in the outcome depend on its true value? | A ausência poderia depender do valor verdadeiro? | se N/PN em 3.2 | NA/Y/PY/PN/N/NI |
| 3.4 | Is it likely that missingness in the outcome depended on its true value? | É provável que a ausência dependesse do valor verdadeiro? | se Y/PY/NI em 3.3 | NA/Y/PY/PN/N/NI |

**Algoritmo:**
- 3.1 = Y/PY → **Low**.
- Senão, 3.2 = Y/PY → **Low**.
- Senão, 3.3 = N/PN → **Low**.
- Senão, 3.4 = N/PN → **Some concerns**; Y/PY/NI → **High**.

## Domínio 4: Medida do desfecho

| Nº | Pergunta (original) | Tradução | Quando | Respostas |
|---|---|---|---|---|
| 4.1 | Was the method of measuring the outcome inappropriate? | O método de medida era inadequado? | sempre | Y/PY/PN/N/NI |
| 4.2 | Could measurement or ascertainment of the outcome have differed between intervention groups? | A medida poderia diferir entre grupos? | sempre | Y/PY/PN/N/NI |
| 4.3 | Were outcome assessors aware of the intervention received by study participants? | Avaliadores sabiam a intervenção? | se N/PN/NI em 4.1 e 4.2 | NA/Y/PY/PN/N/NI |
| 4.4 | Could assessment of the outcome have been influenced by knowledge of intervention received? | A avaliação poderia ser influenciada por esse conhecimento? | se Y/PY/NI em 4.3 | NA/Y/PY/PN/N/NI |
| 4.5 | Is it likely that assessment of the outcome was influenced by knowledge of intervention received? | É provável que tenha sido influenciada? | se Y/PY/NI em 4.4 | NA/Y/PY/PN/N/NI |

Nota oficial: em desfechos relatados pelo participante, o avaliador é o próprio participante.

**Algoritmo:**
- 4.1 = Y/PY → **High**.
- 4.1 = N/PN/NI → ir para 4.2:
  - 4.2 = Y/PY → **High**.
  - 4.2 = **N/PN** → ir para 4.3:
    - 4.3 = N/PN → **Low**.
    - Senão, 4.4 = N/PN → **Low**.
    - Senão, 4.5 = N/PN → **Some concerns**; Y/PY/NI → **High**.
  - 4.2 = **NI** → ir para 4.3:
    - 4.3 = N/PN → **Some concerns**.
    - Senão, 4.4 = N/PN → **Some concerns**.
    - Senão, 4.5 = N/PN → **Some concerns**; Y/PY/NI → **High**.

## Domínio 5: Seleção do resultado relatado

| Nº | Pergunta (original) | Tradução | Respostas |
|---|---|---|---|
| 5.1 | Were the data that produced this result analysed in accordance with a pre-specified analysis plan that was finalized before unblinded outcome data were available for analysis? | Os dados foram analisados conforme plano pré-especificado, finalizado antes dos dados sem cegamento? | Y/PY/PN/N/NI |
| 5.2 | Is the numerical result being assessed likely to have been selected, on the basis of the results, from multiple eligible outcome measurements (e.g. scales, definitions, time points) within the outcome domain? | O resultado provavelmente foi selecionado entre várias medidas elegíveis? | Y/PY/PN/N/NI |
| 5.3 | ... multiple eligible analyses of the data? | ... entre várias análises elegíveis? | Y/PY/PN/N/NI |

**Algoritmo:**
- 5.2 ou 5.3 = Y/PY → **High**.
- 5.2 e 5.3 ambas N/PN → ir para 5.1: Y/PY → **Low**; N/PN/NI → **Some concerns**.
- Pelo menos uma NI, e nenhuma Y/PY → **Some concerns**.

## Julgamento geral (do resultado)

| Julgamento | Critério (original) |
|---|---|
| Low risk of bias | The study is judged to be at low risk of bias for all domains for this result. |
| Some concerns | The study is judged to raise some concerns in at least one domain for this result, but not to be at high risk of bias for any domain. |
| High risk of bias | The study is judged to be at high risk of bias in at least one domain for this result. Or the study is judged to have some concerns for multiple domains in a way that substantially lowers confidence in the result. |

A segunda condição de "High" ("some concerns" em vários domínios) é um julgamento humano, não automático. O sistema deve sugerir e pedir confirmação.

## Visualização

O padrão é o **robvis**: gráfico "semáforo" (estudo × domínio, com verde, amarelo e vermelho) e gráfico de barras com a proporção de cada julgamento por domínio. O site oficial informa que não dá mais suporte ao robvis nem às planilhas Excel.

## Cobertura no Fichamento

| Item | Status |
|---|---|
| Catálogo: RoB 2 com liga/desliga (spec 010, R11) | ⬜ |
| Considerações preliminares (desenho, efeito de interesse, desvios, fontes) | ⬜ |
| Avaliação por resultado/desfecho | ⬜ |
| Domínio 1 (3 perguntas) + algoritmo | ⬜ |
| Domínio 2, atribuição (7 perguntas, condicionais) + algoritmo em duas partes | ⬜ |
| Domínio 2, adesão (6 perguntas, "se aplicável") + algoritmo | ⬜ |
| Domínio 3 (4 perguntas) + algoritmo | ⬜ |
| Domínio 4 (5 perguntas) + algoritmo | ⬜ |
| Domínio 5 (3 perguntas) + algoritmo | ⬜ |
| Julgamento geral (com confirmação humana para "vários some concerns") | ⬜ |
| Sobrescrever julgamento do algoritmo com justificativa | ⬜ |
| Direção do viés (opcional) | ⬜ |
| Notas de elaboração de cada pergunta como instrução ao extrator | ⬜ |
| Variante cluster (domínio 1b) — transcrever do guia completo | ⬜ |
| Variante crossover — transcrever do guia completo | ⬜ |
| Gráficos semáforo e de barras | ⬜ |
| Testes do algoritmo contra exemplos (spec 010) | ⬜ |

## Licença

Texto da ficha oficial e do rodapé do site: *"This work is licensed under a Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License."* e *"RoB 2, ROBINS-I, ROBINS-E and ROB ME are licensed under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0"*. Contato: risk-of-bias@bristol.ac.uk.

O que isso significa para o Fichamento:
- **Não comercial:** num produto pago, é preciso permissão dos autores.
- **Sem derivados:** uma tradução para o português é obra derivada, então mostrar o texto traduzido também exige permissão.

Até haver decisão, o RoB 2 fica **desligado por padrão** no catálogo (spec 010). Os algoritmos (lógica de decisão) não são texto, mas convém incluí-los no mesmo pedido de permissão.

## Referências

- Sterne JAC, Savović J, Page MJ et al. RoB 2: a revised tool for assessing risk of bias in randomised trials. *BMJ*. 2019;366:l4898. doi:10.1136/bmj.l4898
- Higgins JPT, Savović J, Page MJ, Sterne JAC (eds.). *Revised Cochrane risk-of-bias tool for randomized trials (RoB 2): short version (cribsheet)*. 2019. Página oficial: https://sites.google.com/site/riskofbiastool/welcome/rob-2-0-tool/current-version-of-rob-2
- Higgins JPT et al. Chapter 8: Assessing risk of bias in a randomized trial. *Cochrane Handbook for Systematic Reviews of Interventions*. https://training.cochrane.org/handbook
- McGuinness LA, Higgins JPT. Risk-of-bias VISualization (robvis). *Research Synthesis Methods*. 2021;12(1):55–61.
