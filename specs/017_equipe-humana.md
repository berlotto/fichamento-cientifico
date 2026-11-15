# 3.5 Equipe humana

**Spec**: 017_equipe-humana.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Fora da revisão sistemática, o caso mais comum é o orientador acompanhar o fichamento do aluno. Dentro dela, é o segundo revisor humano. Hoje o Fichamento é de um usuário só, com RLS por dono do projeto.

Esta spec acrescenta pessoas como revisores, reaproveitando o modelo de revisores da spec 011.

## Descrição

1. **Membros do projeto:** o dono convida por e-mail. Papéis: *dono*, *revisor* e *leitor* (só vê e comenta).
2. **Comentários de equipe** em artigo e campo, separados do comentário crítico pessoal (spec 001).
3. **Revisor humano** entra na lista de revisores do projeto (spec 011) e responde às etapas.
4. **Modo duplo-cego** (opcional): cada revisor humano responde sem ver o outro. A tela de consenso (spec 011) é a mesma.
5. Com dois humanos independentes, o relato pode falar em dupla revisão humana; a declaração de IA (spec 018) diz o que os agentes fizeram.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Tabela `project_members` com papel; RLS reescrita de "dono" para "membro com papel" | ⬜ |
| R2 | Convite por e-mail com aceite; remover membro | ⬜ |
| R3 | Permissões por papel em todas as ações (upload, editar campo, revisar, exportar, excluir) | ⬜ |
| R4 | Comentários de equipe com autor e data | ⬜ |
| R5 | Membro revisor vira um `reviewer` humano (spec 011) | ⬜ |
| R6 | Duplo-cego: a API não devolve a resposta do outro revisor antes do consenso | ⬜ |
| R7 | Custos de LLM e limites contam para o dono do projeto | ⬜ |

## Critérios de Aceite

- [ ] Um leitor não consegue alterar nada (testes de RLS para cada papel)
- [ ] No duplo-cego, a resposta do outro não aparece nem pela API
- [ ] Remover um membro mantém as respostas dele no histórico

## Fora do Escopo

- Edição simultânea em tempo real
- Organizações com cobrança própria
- Notificações além do convite

## Notas Técnicas

- **Mudança grande de segurança:** todas as políticas RLS e funções `security definer` mudam. Fazer numa migração só, com a bateria de testes de RLS ampliada para os três papéis.
- Specs 001–004 nascem com RLS de dono. Ao implementar esta, revisar as tabelas delas.

## Dependências

- Depende de: 011 (modelo de revisores).
- Afeta: RLS de todas as tabelas.

## Perguntas em aberto

1. Os três papéis bastam?
2. Quem paga o LLM quando um revisor convidado reextrai: o dono ou quem disparou?
