# 2.3 Modelos de campos por tipo de pesquisa

**Spec**: 007_modelos-de-campos.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Cada área estrutura a pergunta de pesquisa de um jeito: a clínica usa PICO, a pesquisa qualitativa usa SPIDER, os estudos de exposição usam PEO, as revisões de escopo usam PCC. O Fichamento já tem campos personalizados por projeto (até 20), mas o pesquisador precisa saber o que criar e escrever a definição de cada um. Modelos prontos resolvem isso e melhoram a extração, porque a definição de cada campo vai para o prompt.

## Descrição

1. Ao criar um projeto (ou nas configurações), o pesquisador escolhe um modelo: **Padrão** (campos atuais), **PICO/PICOS**, **SPIDER**, **PEO**, **PCC**, **Qualitativo**, **Estudo de caso**.
2. O modelo cria campos personalizados já com nome, definição e instrução de extração. O pesquisador pode editar, remover e acrescentar depois.
3. Cada modelo tem uma página de ajuda curta, ligada à documentação em `docs/`.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Definição dos modelos em código (`lib/field-templates.ts`), com chave, nome, definição e instrução por campo | ⬜ |
| R2 | Modelo PICO/PICOS conforme `docs/pico.md` | ⬜ |
| R3 | Modelo SPIDER conforme `docs/spider.md` | ⬜ |
| R4 | Modelo PEO e PCC conforme `docs/peo.md` | ⬜ |
| R5 | Escolha do modelo na criação do projeto e aplicação em projeto existente (sem apagar campos já revisados) | ⬜ |
| R6 | Texto de ajuda de cada modelo na interface, com link para a doc | ⬜ |
| R7 | Respeitar o limite de campos personalizados (o modelo cabe no limite do usuário) | ⬜ |

## Critérios de Aceite

- [ ] Criar um projeto PICO gera os campos População, Intervenção, Comparação, Desfecho (e Desenho, se PICOS) com definições
- [ ] Aplicar um modelo a projeto existente não apaga valores já revisados de campos com a mesma chave
- [ ] A extração de um artigo clínico preenche os campos PICO com trecho e página
- [ ] Se o modelo passar do limite de campos do usuário, a interface avisa antes de aplicar

## Fora do Escopo

- Modelos criados e compartilhados por usuários
- Versionamento de template (F1.1 completo, no plano)
- Checklists de qualidade (spec 010), que são outra coisa: avaliam o estudo, não descrevem

## Notas Técnicas

- Começar com os modelos como dados em código; uma tabela só se houver modelos de usuário.
- A extração de campos personalizados já usa a definição do campo no prompt; conferir se o tamanho do prompt cresce muito com 6 a 8 campos a mais.

## Dependências

- Usa: campos personalizados (F1.1 simplificado).
- Documentação: `docs/pico.md`, `docs/spider.md`, `docs/peo.md`.

## Perguntas em aberto

1. Quais modelos entram na primeira versão? Sugestão: Padrão, PICO, SPIDER, PEO, PCC.
2. Os campos do modelo substituem os 6 campos fixos ou se somam a eles?
