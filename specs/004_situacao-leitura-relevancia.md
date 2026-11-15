# 1.4 Situação de leitura e relevância

**Spec**: 004_situacao-leitura-relevancia.md
**Status**: done (aguardando validação do usuário)
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
| R1 | Colunas `reading_status`, `relevance`, `starred` em `articles`, com `grant update` só nessas colunas | ✅ |
| R2 | Edição rápida na lista de artigos e na ficha | ✅ |
| R3 | Filtros por situação, relevância e estrela na lista | ✅ |
| R4 | Contagens na visão do projeto (ex.: "32 lidos de 80") | ✅ |
| R5 | Descartados fora da matriz e dos exports por padrão, com opção de incluir | ✅ |
| R6 | Colunas de situação e relevância nos exports xlsx/CSV | ✅ |

## Critérios de Aceite

- [x] Mudar a situação não altera o status do pipeline e vice-versa
- [x] Um artigo descartado continua acessível pelo filtro "descartados"
- [x] O usuário não consegue alterar o status do pipeline pelo mesmo caminho (teste de grant)

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

## Perguntas em aberto (respondidas na implementação)

1. ~~Estados servem?~~ Sim: a ler, lendo, lido, fichado, descartado; central, apoio, periférico.
2. ~~Descartado = triagem?~~ Ficam separados por enquanto. A spec 008 decide se usa o mesmo campo.
3. ~~Fichado automático?~~ Não: o pesquisador marca. Verificar os campos não quer dizer ter terminado a leitura.

## Decisões tomadas na implementação (2026-11-16)

- **Colunas** (`20261116000000_reading_status.sql`): `reading_status` (padrão `to_read`), `relevance` (pode ficar vazia) e `starred`, todas com `check`. O `grant update` vale só para as três: o status do pipeline continua fora do alcance do usuário, e há teste de integração para isso.
- **Ficha**: estrela, seletor de leitura e relevância em três botões (clicar de novo na marcada tira a relevância).
- **Lista**:
  - Cada artigo ganha um seletor de situação e a estrela, com a relevância ao lado da citação.
  - Filtros por situação, relevância, tema e prioridade. O padrão é "Sem descartados", e "Descartado (n)" mostra os descartados, que aparecem esmaecidos.
- **Visão do projeto**: o quadro "Sua leitura" mostra "N lidos de M" (lido + fichado, sem os descartados), mais as contagens por situação, por relevância e de prioridade. Os totais vêm do `project_stats`, somados no banco.
- **Matriz e exportações**: os descartados ficam de fora por padrão. Para incluí-los há o botão "Incluir descartados" na matriz e a caixa na visão do projeto (`&descartados=1`). A matriz avisa quantos ficaram de fora. O Excel e o CSV ganham as colunas "Situação de leitura", "Relevância" e "Prioridade".
