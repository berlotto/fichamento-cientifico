# 3.3 Risco de viés (RoB 2)

**Spec**: 010_qualidade-risco-vies.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Revisões sistemáticas de intervenção precisam avaliar o risco de viés de cada estudo incluído. Para ensaios clínicos randomizados, o instrumento de referência é o **RoB 2** da Cochrane (definição completa, perguntas e algoritmos em `docs/rob-2.md`).

Por decisão de 2026-11-14, o Fichamento usa só o RoB 2. Outros instrumentos (ROBINS-I, CASP, JBI, AMSTAR 2) ficam fora, conforme `docs/README.md`.

O Fichamento já tem o que esse trabalho pede: trecho literal com página, segundo modelo, juiz e revisão humana. O LLM propõe a resposta de cada pergunta com a evidência, e o humano decide.

## Descrição

1. O RoB 2 aparece num catálogo de instrumentos em Configurações > Administração, com liga/desliga. Ele começa desligado por causa da licença (CC BY-NC-ND).
2. Com o RoB 2 ligado, o projeto pode ativar a avaliação. Ela vale para artigos marcados como ensaio randomizado: o desenho é sugerido pelo LLM e confirmado pelo pesquisador.
3. A avaliação é **por resultado**. O pesquisador escolhe o desfecho/resultado e o efeito de interesse (atribuição ou adesão).
4. Para cada pergunta de sinalização, o LLM propõe a resposta (Y/PY/PN/N/NI) com trecho e página. Perguntas condicionais só aparecem quando acionadas.
5. O pesquisador aceita ou muda cada resposta. O julgamento por domínio sai do algoritmo oficial e pode ser sobrescrito com justificativa.
6. Julgamento geral do resultado e direção do viés (opcional).
7. Saídas: tabela-resumo, gráfico semáforo e gráfico de barras por domínio.
8. Sugestão de texto de métodos declarando o uso de IA na avaliação (spec 018).

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | RoB 2 como dados em código (`lib/appraisal/rob2.ts`): domínios, perguntas, condições, opções e algoritmos | ⬜ |
| R2 | Considerações preliminares: desenho, resultado, efeito de interesse e desvios considerados | ⬜ |
| R3 | Domínios 1, 2 (atribuição e adesão), 3, 4 e 5 com as condicionais | ⬜ |
| R4 | Algoritmos por domínio e julgamento geral, com testes de tabela-verdade | ⬜ |
| R5 | Sugestão do LLM por pergunta com trecho e página, verificada por `verify.ts`; sem evidência no texto, a resposta sugerida é NI | ⬜ |
| R6 | Revisão humana por pergunta e sobrescrita do julgamento com justificativa | ⬜ |
| R7 | "High" por vários "some concerns" só com confirmação humana | ⬜ |
| R8 | Gráficos semáforo e de barras, exportáveis em SVG/PNG | ⬜ |
| R9 | Catálogo de instrumentos com liga/desliga, selo da licença e link para a doc; desligar não apaga avaliações, que ficam somente leitura | ⬜ |
| R10 | Versão do instrumento gravada em cada avaliação | ⬜ |
| R11 | Permissão de uso do RoB 2 obtida (ou decisão registrada de manter só em uso não comercial) | ⬜ |

## Critérios de Aceite

- [ ] Para cada domínio, o algoritmo bate com a tabela-verdade derivada da ficha oficial (todas as combinações de respostas)
- [ ] A pergunta 2.3 só aparece com Y/PY/NI em 2.1 ou 2.2; vale o mesmo para as demais condicionais
- [ ] Nenhum julgamento fica final sem confirmação humana
- [ ] Um artigo pode ter várias avaliações, uma por resultado
- [ ] Com o RoB 2 desligado, nenhum projeto consegue iniciar avaliação nova

## Fora do Escopo

- Variantes cluster e crossover do RoB 2 (podem entrar depois, a partir do guia completo)
- Qualquer outro instrumento (ver `docs/README.md`, "Não utilizados")
- GRADE

## Notas Técnicas

- **Licença:** CC BY-NC-ND 4.0, ou seja, não comercial e sem derivados (uma tradução para o português conta como derivado). Enquanto não houver permissão, mostrar as perguntas no original em inglês, com a tradução só como ajuda, e manter o instrumento desligado por padrão. Contato: risk-of-bias@bristol.ac.uk.
- Modelo de dados: `rob2_assessments(article_id, outcome, result, effect, instrument_version, …)` e `rob2_answers(assessment_id, question, answer, llm_answer, quote, pdf_page, reviewer_id)`. A coluna `reviewer_id` prepara a spec 011.
- Custo: são cerca de 22 perguntas por resultado. Enviar todas numa chamada com o texto do artigo e saída estruturada.

## Dependências

- Usa: pipeline de extração, juiz (F2), `verify.ts`.
- Relacionada a 011 (revisores múltiplos) e 018 (declaração de uso de IA).

## Perguntas em aberto

1. Vai pedir a permissão dos autores do RoB 2 agora, ou manter desligado até o produto ter usuários de revisão sistemática?
