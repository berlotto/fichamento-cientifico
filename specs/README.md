# Specs

Especificações das funcionalidades novas do Fichamento, a partir do levantamento de 2026-11-14 sobre o que pesquisadores precisam no fichamento de artigos.

Cada spec tem um **status geral** no cabeçalho e uma tabela **Requisitos** com o status de cada item. Para acompanhar a completude, atualize as duas coisas: a tabela de requisitos na spec e a coluna Status aqui.

## Legenda de status

**Spec (geral):** `draft` (em discussão) · `ready` (aprovada para implementar) · `in-progress` · `done`

**Requisito (item):** ⬜ pendente · 🔄 em andamento · ✅ feito · ⛔ descartado

## Índice

| Nº | Item | Spec | Status | Requisitos feitos |
|---|---|---|---|---|
| 1.1 | Comentário crítico | [001_comentario-critico.md](001_comentario-critico.md) | done | 7/7 |
| 1.2 | Citações marcadas à mão | [002_citacoes-manuais.md](002_citacoes-manuais.md) | done | 7/8 (R7 parcial) |
| 1.3 | Tags e temas | [003_tags-temas.md](003_tags-temas.md) | draft | 0/8 |
| 1.4 | Situação de leitura e relevância | [004_situacao-leitura-relevancia.md](004_situacao-leitura-relevancia.md) | draft | 0/6 |
| 2.1 | Limitações, lacunas e trabalhos futuros | [005_limitacoes-lacunas.md](005_limitacoes-lacunas.md) | draft | 0/6 |
| 2.2 | Definições e glossário | [006_definicoes-glossario.md](006_definicoes-glossario.md) | draft | 0/7 |
| 2.3 | Modelos de campos (PICO, SPIDER, PEO…) | [007_modelos-de-campos.md](007_modelos-de-campos.md) | draft | 0/7 |
| 3.1 | Triagem | [008_triagem.md](008_triagem.md) | draft | 0/9 |
| 3.2 | Fluxograma PRISMA 2020 | [009_fluxograma-prisma.md](009_fluxograma-prisma.md) | draft | 0/7 |
| 3.3 | Risco de viés (RoB 2) | [010_qualidade-risco-vies.md](010_qualidade-risco-vies.md) | draft | 0/11 |
| 3.4 | Revisores múltiplos (agentes de IA) | [011_revisores-multiplos.md](011_revisores-multiplos.md) | draft | 0/9 |
| 3.5 | Equipe humana | [017_equipe-humana.md](017_equipe-humana.md) | draft | 0/7 |
| 4.1 | Referências e bola de neve | [012_referencias-bola-de-neve.md](012_referencias-bola-de-neve.md) | draft | 0/7 |
| 4.2 | Contradições e concordâncias | [013_contradicoes-concordancias.md](013_contradicoes-concordancias.md) | draft | 0/6 |
| 4.3 | Retratação e duplicatas | [014_retratacao-duplicatas.md](014_retratacao-duplicatas.md) | draft | 0/6 |
| 5.1 | Ficha em Word/PDF (ABNT) | [015_ficha-word-pdf.md](015_ficha-word-pdf.md) | draft | 0/7 |
| 5.2 | Exportação Markdown e RIS | [016_export-markdown-ris.md](016_export-markdown-ris.md) | draft | 0/6 |
| 6.1 | Declaração de uso de IA | [018_declaracao-uso-ia.md](018_declaracao-uso-ia.md) | draft | 0/7 |

## Ordem sugerida

1. **Fichamento clássico:** 1.1, 1.2, 1.3, 1.4. Não chamam o LLM e completam a ficha.
2. **Campos novos:** 2.1, 2.2, 2.3. Usam a extração que já existe.
3. **Saídas:** 5.1, 5.2.
4. **Revisão sistemática:** 3.1 → 3.2 → 3.3 → 3.4 → 3.5. Só se o público incluir quem faz revisão sistemática.
5. **Relações entre artigos:** 4.3, 4.1, 4.2.
6. **Transversal:** 6.1 (declaração de uso de IA) acompanha cada entrega que gera exportação; a primeira versão pode sair já com as exportações atuais.

## Referências

Os instrumentos citados nas specs (PICO, PRISMA, RoB 2 etc.) estão definidos em [`../docs/`](../docs/README.md).
