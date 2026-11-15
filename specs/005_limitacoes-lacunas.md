# 2.1 Limitações, lacunas e trabalhos futuros

**Spec**: 005_limitacoes-lacunas.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Para justificar uma pesquisa, o pesquisador precisa mostrar a lacuna: o que os estudos anteriores não fizeram ou reconhecem não ter feito. Essa informação está quase sempre na discussão do artigo ("este estudo tem limitações…", "pesquisas futuras devem…") e hoje não é extraída. Os campos fixos são `abstract`, `subject`, `objective`, `method`, `results`, `conclusions`.

## Descrição

Três campos novos na extração, com o mesmo contrato dos atuais (valor, trecho literal, página, verificação, revisão):

1. **Limitações declaradas:** limitações que os próprios autores reconhecem.
2. **Trabalhos futuros:** o que os autores sugerem pesquisar depois.
3. **Lacunas apontadas:** lacunas da literatura que o artigo diz preencher ou que ainda existem.

O projeto escolhe quais desses campos ficam ligados (padrão: limitações e trabalhos futuros).

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Novas chaves em `article_fields` (`limitations`, `future_work`, `gaps`), ajustando o `check` | ⬜ |
| R2 | Prompt de extração com definição de cada campo e regra: só o que os autores declaram, nunca inferido pelo modelo | ⬜ |
| R3 | Valor "não declarado" quando o artigo não traz o item (sem trecho, sem inventar) | ⬜ |
| R4 | Cross-check e juiz (F2) cobrindo os novos campos | ⬜ |
| R5 | Liga/desliga por projeto nas configurações | ⬜ |
| R6 | Colunas na matriz e nos exports | ⬜ |

## Critérios de Aceite

- [ ] Num artigo com seção de limitações, o trecho vem dessa seção e é localizado no PDF
- [ ] Num artigo sem limitações declaradas, o campo fica "não declarado", não uma limitação inventada
- [ ] O juiz reprova limitação tirada de outro estudo citado na introdução
- [ ] Taxa de acerto dos novos campos aparece em "Qualidade da extração"

## Fora do Escopo

- Avaliação crítica das limitações pelo LLM (isso é do pesquisador, spec 001, ou de checklist, spec 010)
- Síntese das lacunas do projeto inteiro (F3.3)

## Notas Técnicas

- Outra opção é implementar como campos personalizados pré-prontos, sem mexer no `check`. Mas os campos fixos têm prompt e juiz próprios; se a qualidade importa, campos fixos são melhores.
- Cuidado com custo: três campos a mais aumentam os tokens de saída da extração e do cross-check. Medir com o gold set.

## Dependências

- Pode ser implementada junto com 006 (definições), que mexe no mesmo prompt.
- Relacionada a 007 (modelos de campos).

## Perguntas em aberto

1. Campos fixos ou campos personalizados prontos?
2. "Lacunas apontadas" vale a pena, ou se confunde demais com limitações?
3. Esses campos podem receber aprovação automática ou ficam sempre na revisão humana?
