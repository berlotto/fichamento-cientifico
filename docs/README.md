# Documentação de referência

Definições dos instrumentos, modelos e formatos citados nas specs (`../specs/`). Cada documento tem:

- **Status da doc:** `rascunho` (falta conferir com a fonte oficial), `parcialmente conferida`, `conferida` (itens batidos com a fonte oficial) ou `desatualizada` (saiu versão nova).
- **Definição completa:** o que é, para que serve, estrutura item a item.
- **Licença:** o que a licença permite ao Fichamento.
- **Cobertura no Fichamento:** status de cada item no produto (⬜ pendente · 🔄 em andamento · ✅ feito · ⛔ não se aplica). É a medida de completude da implementação.

## Índice

| Documento | Tipo | Usado em | Status da doc |
|---|---|---|---|
| [fichamento-abnt.md](fichamento-abnt.md) | Tipos de fichamento, NBR 6023 e NBR 10520:2023 | 001, 002, 015 | conferida (guias de bibliotecas) |
| [pico.md](pico.md) | Estrutura de pergunta: PICO, PICOS, PICOT, PICOC | 007 | rascunho (conceitual) |
| [spider.md](spider.md) | Estrutura de pergunta qualitativa | 007 | rascunho (conceitual) |
| [peo.md](peo.md) | Estrutura de pergunta de exposição; PCC | 007 | rascunho (conceitual) |
| [prisma-2020.md](prisma-2020.md) | Diretriz de relato de revisão sistemática e fluxograma | 008, 009, 018 | conferida (27 itens) |
| [rob-2.md](rob-2.md) | Risco de viés em ensaio randomizado | 010 | conferida (perguntas e algoritmos) |
| [ris.md](ris.md) | Formato de arquivo de referências | 008, 016 | rascunho |

## Instrumentos de avaliação e relato adotados

Por decisão de 2026-11-14, o Fichamento usa **só RoB 2 e PRISMA 2020**.

| ID | Instrumento | Licença | Padrão no catálogo |
|---|---|---|---|
| `prisma-2020` | PRISMA 2020 (checklist e fluxograma) | CC BY 4.0, uso comercial permitido com citação | ligado |
| `rob-2` | RoB 2 | CC BY-NC-ND 4.0: não comercial, sem derivados (tradução incluída) | desligado até haver permissão (risk-of-bias@bristol.ac.uk) |

## Não utilizados: não implementar

Estes instrumentos foram pesquisados e **descartados**, principalmente por causa de licença. Não devem ser implementados nem ter o texto reproduzido no repositório. Se um dia isso mudar, a decisão precisa ser registrada aqui antes.

| Instrumento | Para que serve | Motivo |
|---|---|---|
| ROBINS-I (2016 e V2) | Risco de viés em estudo não randomizado de intervenção | CC BY-NC-ND; a V2 ainda é rascunho |
| CASP (11 checklists) | Avaliação crítica por desenho (qualitativo, coorte, caso-controle etc.) | CC BY-NC-SA |
| JBI Critical Appraisal Tools (15) | Avaliação crítica por desenho | "for research purposes only" |
| AMSTAR 2 | Avaliação de revisões sistemáticas | Licença livre (CC BY 4.0), mas fora do escopo por decisão |
| QUADAS-2, PROBAST, ROBINS-E, Newcastle-Ottawa, GRADE | Diagnóstico, predição, exposição, observacionais, certeza da evidência | Fora do escopo |

**Consequência para o produto:** o risco de viés só existe para ensaios randomizados (RoB 2). Para os outros desenhos, o pesquisador registra a avaliação no comentário crítico (spec 001) ou em campos personalizados.

## Outras estruturas de pergunta (não detalhadas)

- **SPICE** (Setting, Perspective, Intervention, Comparison, Evaluation): Booth, 2006.
- **ECLIPSE** (Expectation, Client group, Location, Impact, Professionals, Service): Wildridge e Bell, 2002.
- **CoCoPop** (Condition, Context, Population): JBI, revisões de prevalência.
