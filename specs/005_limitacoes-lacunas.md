# 2.1 Limitações, lacunas e trabalhos futuros

**Spec**: 005_limitacoes-lacunas.md
**Status**: done (aguardando validação do usuário)
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
| R1 | Novas chaves em `article_fields` (`limitations`, `future_work`, `gaps`), ajustando o `check` | ✅ |
| R2 | Prompt de extração com definição de cada campo e regra: só o que os autores declaram, nunca inferido pelo modelo | ✅ |
| R3 | Valor "não declarado" quando o artigo não traz o item (sem trecho, sem inventar) | ✅ |
| R4 | Cross-check e juiz (F2) cobrindo os novos campos | ✅ |
| R5 | Liga/desliga por projeto nas configurações | ✅ |
| R6 | Colunas na matriz e nos exports | ✅ |

## Critérios de Aceite

- [x] Num artigo com seção de limitações, o trecho vem dessa seção e é localizado no PDF
- [ ] Num artigo sem limitações declaradas, o campo fica "não declarado", não uma limitação inventada — regra no prompt e exibição prontas; falta conferir com artigos reais sem limitações
- [ ] O juiz reprova limitação tirada de outro estudo citado na introdução — o juiz já confere se o trecho é deste estudo (from_study); falta caso de teste real
- [x] Taxa de acerto dos novos campos aparece em "Qualidade da extração"

## Fora do Escopo

- Avaliação crítica das limitações pelo LLM (isso é do pesquisador, spec 001, ou de checklist, spec 010)
- Síntese das lacunas do projeto inteiro (F3.3)

## Notas Técnicas

- Outra opção é implementar como campos personalizados pré-prontos, sem mexer no `check`. Mas os campos fixos têm prompt e juiz próprios; se a qualidade importa, campos fixos são melhores.
- Cuidado com custo: três campos a mais aumentam os tokens de saída da extração e do cross-check. Medir com o gold set.

## Dependências

- Pode ser implementada junto com 006 (definições), que mexe no mesmo prompt.
- Relacionada a 007 (modelos de campos).

## Perguntas em aberto (respondidas na implementação)

1. ~~Fixos ou personalizados?~~ Fixos opcionais: prompt e definição próprios, juiz cobrindo, liga/desliga por projeto.
2. ~~Lacunas vale?~~ Entra, desligada por padrão; o prompt separa lacuna da literatura de limitação do estudo.
3. ~~Aprovação automática?~~ Seguem as regras dos outros campos; o projeto pode marcá-los como críticos.

## Decisões tomadas na implementação (2026-11-17)

- **Campos fixos opcionais** (`OPTIONAL_FIELDS` em `lib/fields.ts`): `limitations`, `future_work` e `gaps`, cada um com nome, definição (para o juiz) e instrução de prompt. A coluna `projects.optional_fields` vem com limitações e trabalhos futuros por padrão, também nos projetos que já existem; elas aparecem na próxima extração.
- **R1**: o `check` de `article_fields.key` já aceitava qualquer chave válida (desde a F1), então não precisou mudar. O check novo está em `projects.optional_fields`, que só aceita as três chaves.
- **Prompt** (`extract-v3`): os campos opcionais entram numa seção própria. A regra é registrar só o que os autores declaram, com trecho da passagem da declaração, e devolver null na falta. Um campo personalizado com a mesma chave não entra duas vezes.
- **"Não declarado"**: não se grava linha vazia. Um campo opcional ligado que não veio num artigo já extraído aparece como "Não declarado pelos autores" na ficha, como "não declarado" na matriz e com o mesmo texto no Excel e no CSV. Assim, nada sem trecho é gravado como se tivesse sido conferido.
- **Cross-check e juiz**: o segundo extrator recebe os mesmos campos opcionais, e o juiz usa a definição de cada um.
- **Configuração**: a seção "O que os autores declaram" na visão do projeto.
- **Teste com o modelo** (gpt-5-mini, texto de exemplo): limitações e trabalhos futuros saíram com trecho conferido no PDF.
