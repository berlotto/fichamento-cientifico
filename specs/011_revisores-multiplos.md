# 3.4 Revisores múltiplos (agentes de IA)

**Spec**: 011_revisores-multiplos.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Guias de revisão sistemática recomendam que triagem, extração e avaliação de risco de viés sejam feitas por dois revisores independentes, com resolução das divergências. O Fichamento já faz uma versão disso na F2: extrator A, extrator B de outro provedor e um juiz.

Esta spec generaliza esse arranjo com a entidade **revisor**, que pode ser um agente (modelo + provedor + prompt) ou um humano. Primeiro entram os agentes; a equipe humana (spec 017) reaproveita o mesmo modelo de dados.

**Limite metodológico.** A declaração conjunta de 2025 (Cochrane, Campbell, JBI, CEE; recomendações RAISE) aceita IA com supervisão humana e relato transparente. Ela **não** trata um agente como "segundo revisor independente". Por isso, o Fichamento nunca apresenta a revisão por agentes como dupla revisão humana e sempre sugere o texto de declaração de uso de IA (spec 018).

## Descrição

1. **Revisores-agente:** o projeto escolhe de 2 a 3 agentes de provedores diferentes, a partir dos modelos que o administrador liberou. Por padrão: o extrator e o segundo extrator atuais.
2. **Etapas cobertas:** triagem (spec 008), extração de campos e RoB 2 (spec 010). Cada agente responde de forma independente, sem ver as respostas dos outros.
3. **Consenso:**
   - Agentes concordam → a resposta fica como "concordância entre agentes". Ainda pode precisar de revisão humana, conforme as regras atuais de campo crítico e auditoria.
   - Agentes divergem → o juiz analisa, e o caso vai para o humano numa tela de divergências lado a lado.
4. **Humano como decisor final** em toda divergência e em campos críticos.
5. **Métricas:** concordância entre agentes e entre agentes e humano (percentual e kappa de Cohen), por etapa e por campo, ao lado de "Qualidade da extração".
6. **Registro completo** para o relato: quais modelos, versões, datas e etapas, e quantas decisões foram humanas. Isso alimenta a spec 018.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Tabela `reviewers` (tipo: agent/human; para agentes: provedor, modelo, versão do prompt) por projeto | ⬜ |
| R2 | Respostas por revisor nas etapas (triagem, campo, RoB 2) sem sobrescrever as dos outros | ⬜ |
| R3 | Migrar extrator A/B da F2 para o modelo de revisores sem perder o histórico | ⬜ |
| R4 | Independência: o prompt de um agente nunca recebe a resposta de outro | ⬜ |
| R5 | Regra de consenso configurável por etapa (unanimidade, maioria, sempre humano) | ⬜ |
| R6 | Tela de divergências com as respostas e os trechos lado a lado | ⬜ |
| R7 | Concordância (percentual e kappa) por etapa e campo | ⬜ |
| R8 | Custo por revisor em `llm_runs`, com estimativa antes de ligar o 3º agente | ⬜ |
| R9 | Registro de modelos, versões, datas e etapas para a declaração de IA (spec 018) | ⬜ |

## Critérios de Aceite

- [ ] Com dois agentes divergindo, o caso nunca é aprovado sem decisão humana
- [ ] O kappa calculado bate com um exemplo feito à mão
- [ ] Trocar o modelo de um revisor não altera as respostas já gravadas
- [ ] A interface nunca chama a revisão por agentes de "dupla revisão independente"

## Fora do Escopo

- Revisores humanos convidados (spec 017)
- Agentes que conversam entre si para chegar a consenso (debate). O juiz atual basta

## Notas Técnicas

- Modelos de provedores diferentes compartilham dados de treino, então os erros não são independentes. A concordância precisa ser **medida** (gold set da F2.7), não presumida.
- Custo: N agentes multiplicam as chamadas por N. Usar dois agentes baratos e o juiz só nas divergências.
- `reviewer_id` deve existir nas tabelas novas das specs 008 e 010 desde o início.

## Dependências

- Usa: F2 (extrator B, juiz, auditoria).
- Bloqueia: 017 (equipe humana).
- Alimenta: 018 (declaração de IA).
- Relacionada a 008 e 010.

## Perguntas em aberto

1. Três agentes vale o custo, ou dois + juiz basta?
2. Regra de consenso padrão: unanimidade dos agentes ou sempre humano em campos críticos (como hoje)?
