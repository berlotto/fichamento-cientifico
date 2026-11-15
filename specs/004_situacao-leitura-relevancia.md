# 1.4 Situação de leitura e relevância

**Spec**: 004_situacao-leitura-relevancia.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

O status do artigo hoje é do pipeline (`uploaded`, `parsed`, `extracted`, `needs_review`, `verified`, `failed`). Ele diz se a máquina terminou, não onde o pesquisador está. Num projeto com 80 artigos, o pesquisador precisa saber o que já leu, o que é central para a tese e o que descartou, sem apagar o artigo.

## Descrição

1. **Situação de leitura** (do pesquisador, independente do pipeline): *a ler*, *lendo*, *lido*, *fichado*, *descartado*.
2. **Relevância**: *central*, *apoio*, *periférico* (ou sem relevância definida).
3. **Prioridade** opcional: estrela (marcado ou não).
4. Ambos editáveis na lista de artigos (ação rápida) e na ficha.
5. Filtros e contagens por situação e relevância na visão do projeto. Artigos descartados saem da matriz por padrão.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Colunas `reading_status`, `relevance`, `starred` em `articles`, com `grant update` só nessas colunas | ⬜ |
| R2 | Edição rápida na lista de artigos e na ficha | ⬜ |
| R3 | Filtros por situação, relevância e estrela na lista | ⬜ |
| R4 | Contagens na visão do projeto (ex.: "32 lidos de 80") | ⬜ |
| R5 | Descartados fora da matriz e dos exports por padrão, com opção de incluir | ⬜ |
| R6 | Colunas de situação e relevância nos exports xlsx/CSV | ⬜ |

## Critérios de Aceite

- [ ] Mudar a situação não altera o status do pipeline e vice-versa
- [ ] Um artigo descartado continua acessível pelo filtro "descartados"
- [ ] O usuário não consegue alterar o status do pipeline pelo mesmo caminho (teste de grant)

## Fora do Escopo

- Motivo do descarte e critérios de exclusão (spec 008, triagem)
- Situação diferente por membro da equipe (spec 017)

## Fluxo do Usuário

1. Sobe 30 PDFs; todos entram como *a ler*.
2. Abre um, lê, marca *fichado* e *central*.
3. Na lista, filtra *a ler* para ver o que falta.

## Notas Técnicas

- `fichado` pode ser sugerido automaticamente quando o pipeline chega a `verified`, mas não imposto: a pessoa pode ter verificado sem terminar a leitura.
- Totais no Postgres, como as outras contagens do projeto (commit 988fa08).

## Dependências

- A triagem (008) usa "descartado" com motivo; definir se as duas coisas se fundem.

## Perguntas em aberto

1. Os cinco estados de leitura e os três de relevância servem?
2. "Descartado" aqui e "excluído na triagem" (spec 008) devem ser a mesma coisa?
3. Marcar *fichado* automaticamente quando o artigo fica `verified`?
