# 2.3 Modelos de campos por tipo de pesquisa

**Spec**: 007_modelos-de-campos.md
**Status**: done (aguardando validação do usuário)
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
| R1 | Definição dos modelos em código (`lib/field-templates.ts`), com chave, nome, definição e instrução por campo | ✅ |
| R2 | Modelo PICO/PICOS conforme `docs/pico.md` | ✅ |
| R3 | Modelo SPIDER conforme `docs/spider.md` | ✅ |
| R4 | Modelo PEO e PCC conforme `docs/peo.md` | ✅ |
| R5 | Escolha do modelo na criação do projeto e aplicação em projeto existente (sem apagar campos já revisados) | ✅ |
| R6 | Texto de ajuda de cada modelo na interface, com link para a doc | ✅ |
| R7 | Respeitar o limite de campos personalizados (o modelo cabe no limite do usuário) | ✅ |

## Critérios de Aceite

- [x] Criar um projeto PICO gera os campos População, Intervenção, Comparação, Desfecho (e Desenho, se PICOS) com definições
- [x] Aplicar um modelo a projeto existente não apaga valores já revisados de campos com a mesma chave
- [ ] A extração de um artigo clínico preenche os campos PICO com trecho e página — usa o caminho dos campos personalizados, que já funciona; falta conferir com um artigo clínico real
- [x] Se o modelo passar do limite de campos do usuário, a interface avisa antes de aplicar

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

## Perguntas em aberto (respondidas na implementação)

1. ~~Quais modelos?~~ Padrão, PICO, PICOS, SPIDER, PEO e PCC.
2. ~~Substituem ou somam?~~ Somam: os 6 fixos continuam.

## Decisões tomadas na implementação (2026-11-17)

- **Modelos em código** (`lib/field-templates.ts`): chave, nome e instrução de cada campo, tirados de `docs/pico.md`, `docs/spider.md` e `docs/peo.md`. Há teste para chaves válidas e sem colisão com os campos fixos e opcionais.
- **Aplicar** (`applyFieldTemplate`): cria só os campos com chave que o projeto ainda não tem, depois dos existentes. Nada é apagado, então o que já foi extraído e revisado fica.
- **Limite**: o limite de campos do serviço é lido no servidor. Se não couber, a tela avisa antes (o botão fica desligado) e o servidor recusa sem criar nenhum.
- **Na criação do projeto**: o formulário "Novo projeto" ganha a escolha "Modelo de campos".
- **Em projeto existente**: o seletor fica em "Campos personalizados", com resumo, lista de campos e quantos serão criados. Depois de aplicar, a tela lembra o "Extrair todos de novo".
- **Ajuda**: um resumo de uma frase por modelo e a referência ao documento em `docs/`. Não há link clicável porque `docs/` fica no repositório, não no app.
