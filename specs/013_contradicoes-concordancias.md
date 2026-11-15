# 4.2 Contradições e concordâncias entre artigos

**Spec**: 013_contradicoes-concordancias.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Na discussão de uma revisão, o pesquisador precisa dizer onde os estudos concordam e onde divergem ("X encontrou efeito, Y não"). Com a matriz, ele vê os resultados lado a lado, mas a comparação é manual. O LLM pode propor agrupamentos, desde que cada afirmação venha de células verificadas, como a síntese fundamentada da F3.3.

## Descrição

1. O pesquisador escolhe um campo (ex.: Resultados) ou uma tag (spec 003) e uma pergunta ("efeito da intervenção sobre a adesão").
2. O LLM agrupa os artigos em posições (ex.: "efeito positivo", "sem efeito", "efeito negativo"), cada artigo com o trecho que sustenta a posição.
3. O pesquisador revisa: move artigo de grupo, renomeia grupo, remove.
4. O resultado é salvo como uma "comparação" do projeto e pode ser exportado.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Entrada só de células verificadas (`verified`/aprovadas), nunca do texto bruto | ⬜ |
| R2 | Saída estruturada: grupos → artigos → célula de origem (`article_id`, `field_key`) | ⬜ |
| R3 | Tela de revisão (mover, renomear, remover) | ⬜ |
| R4 | Comparações salvas por projeto | ⬜ |
| R5 | Exportar a comparação (xlsx, Markdown) com citações | ⬜ |
| R6 | Custo registrado em `llm_runs` com estágio próprio | ⬜ |

## Critérios de Aceite

- [ ] Toda posição atribuída a um artigo aponta para uma célula existente; sem célula, não aparece
- [ ] Artigo que o LLM não consegue classificar vai para "não classificado", não some
- [ ] Rodar de novo não apaga as alterações feitas pelo pesquisador sem perguntar

## Fora do Escopo

- Meta-análise ou qualquer cálculo estatístico
- Redação de parágrafos (F3.3)

## Notas Técnicas

- Com muitos artigos, o contexto cresce: enviar só o campo escolhido de cada artigo, não a ficha inteira.
- Mesmo cuidado de injeção de prompt do MCP: trechos dos PDFs são dados, delimitados.

## Dependências

- Usa: 003 (tags), células verificadas (F1/F2).
- Próxima de F3.3; pode ser implementada como primeiro passo dela.

## Perguntas em aberto

1. Faz sentido antes da F3.3 ou como parte dela?
