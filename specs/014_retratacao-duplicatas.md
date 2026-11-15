# 4.3 Retratação e duplicatas

**Spec**: 014_retratacao-duplicatas.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Citar um artigo retratado é um erro sério e comum. O Crossref passou a distribuir os dados do Retraction Watch e marca atualizações (retratação, correção, expressão de preocupação) nos metadados. Duplicatas também acontecem: o mesmo artigo vindo de duas bases, preprint e versão publicada, ou o mesmo PDF com outro arquivo. Hoje o Fichamento só bloqueia o PDF idêntico (`unique (project_id, sha256)`).

## Descrição

1. **Retratação:** ao buscar metadados (e de novo periodicamente), consultar se o DOI tem retratação, correção ou expressão de preocupação. Mostrar um aviso forte na ficha, na lista e na matriz, com link para o aviso.
2. **Duplicatas:** ao entrar um artigo, procurar no projeto por mesmo DOI ou título normalizado + primeiro autor + ano (±1). Marcar como "possível duplicata" e deixar o pesquisador juntar ou manter os dois.
3. **Preprint e publicado:** quando o Crossref liga um preprint à versão publicada (`is-preprint-of`/`has-preprint`), avisar.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Consulta de atualizações editoriais pelo DOI (Crossref `update-to`/Retraction Watch) | ⬜ |
| R2 | Aviso visível de retratação/correção na ficha, lista, matriz e export | ⬜ |
| R3 | Nova verificação periódica (pg_cron, ex.: semanal) dos artigos do projeto | ⬜ |
| R4 | Detecção de duplicata por DOI e por título/autor/ano | ⬜ |
| R5 | Juntar duplicatas mantendo a ficha revisada | ⬜ |
| R6 | Aviso de preprint com versão publicada | ⬜ |

## Critérios de Aceite

- [ ] Um DOI sabidamente retratado aparece com aviso em todas as telas e no export
- [ ] Mesmo artigo com DOI escrito diferente (maiúsculas, prefixo `https://doi.org/`) é reconhecido como duplicata
- [ ] Juntar duplicatas não perde campos revisados nem comentários
- [ ] A verificação periódica respeita o limite de chamadas do Crossref

## Fora do Escopo

- Artigos sem DOI na verificação de retratação
- Detecção de plágio

## Notas Técnicas

- Confirmar na documentação atual do Crossref como os dados do Retraction Watch são expostos (campo `update-to` e o endpoint de atualizações) antes de implementar.
- Normalizar DOI na gravação (minúsculas, sem prefixo) resolve boa parte das duplicatas.

## Dependências

- Usa: metadados Crossref (F1.2).
- Usada por: 008 (duplicatas antes da triagem), 009 (contagem de removidos), 012.

## Perguntas em aberto

1. A verificação periódica vale o custo de chamadas, ou basta checar ao importar e ao exportar?
