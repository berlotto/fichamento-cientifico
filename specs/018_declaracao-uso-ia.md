# 6.1 Declaração de uso de IA

**Spec**: 018_declaracao-uso-ia.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

O Fichamento usa LLMs em quase tudo: metadados, extração, verificação, triagem, risco de viés e síntese. A declaração conjunta de 2025 da Cochrane, Campbell, JBI e CEE (recomendações RAISE) pede três coisas:

- **Supervisão humana**, com os autores responsáveis pelo resultado.
- **Relato completo** de qualquer uso de IA que faça ou sugira julgamentos: nome da ferramenta, versão, data, finalidade e etapas afetadas.
- **Nada de apresentar a IA como revisor independente** equivalente a um humano.

Revistas e programas de pós-graduação também pedem cada vez mais essa declaração. É mais ético, e o Fichamento tem os dados para gerá-la pronta.

**Decisão de produto:** o Fichamento **sempre** sugere ao usuário incluir a declaração de uso de IA, em todo ponto em que entrega algo para ser usado num trabalho.

## Descrição

1. **Registro automático** do uso de IA por projeto, a partir de `llm_runs` e do registro de revisores (spec 011): etapas, modelos e versões, período, quantidade de decisões da IA aceitas, editadas e rejeitadas pelo humano, taxa de auditoria e concordância.
2. **Texto sugerido para a seção de métodos**, em português e inglês, com:
   - ferramenta (Fichamento) e data;
   - modelos e provedores por etapa;
   - o que a IA fez (sugeriu, extraiu, verificou) e o que o humano fez (revisou, decidiu);
   - supervisão: proporção de itens revisados por humano e auditoria;
   - limites: os agentes não substituem revisores humanos independentes.
3. **Onde a sugestão aparece** (sempre, com botão "copiar"):
   - página do projeto ("Declaração de uso de IA");
   - exportações (xlsx, CSV, ficha Word/PDF, Markdown), como aba, rodapé ou arquivo à parte;
   - fluxograma PRISMA (spec 009) e avaliação RoB 2 (spec 010), com o trecho para os itens 8, 9 e 11 do PRISMA 2020;
   - síntese fundamentada (F3.3).
4. O usuário pode dispensar o aviso numa exportação, mas ele volta na próxima. O texto nunca é inserido sem o usuário ver.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Agregação por projeto: etapas, modelos, versões, período e decisões humanas (aceitas/editadas/rejeitadas) | ⬜ |
| R2 | Gerador do texto de métodos em PT e EN (código, não LLM, para não inventar) | ⬜ |
| R3 | Página "Declaração de uso de IA" no projeto, com copiar | ⬜ |
| R4 | Aviso com o texto em todas as exportações | ⬜ |
| R5 | Trechos específicos para os itens 8, 9 e 11 do PRISMA 2020 | ⬜ |
| R6 | Texto nunca chama agentes de "revisores independentes" | ⬜ |
| R7 | Lista de modelos com versão e data exatas (do `llm_runs`), não só o nome comercial | ⬜ |

## Critérios de Aceite

- [ ] Em um projeto com extração, cross-check e auditoria, o texto cita os três modelos, o período e a proporção revisada por humano
- [ ] Toda exportação mostra a sugestão antes de baixar
- [ ] O texto gerado é determinístico: os mesmos dados geram o mesmo texto
- [ ] Projeto sem nenhuma revisão humana gera um texto que diz isso claramente

## Fora do Escopo

- Detectar uso de IA fora do Fichamento
- Checklist RAISE completo (pode virar spec própria)

## Notas Técnicas

- Conferir a versão vigente das recomendações RAISE ao implementar. Em setembro de 2025 a v2.1 estava em desenvolvimento.
- O texto é gerado por modelo de frases preenchido com dados, não por LLM. A declaração precisa ser exata.

## Dependências

- Usa: `llm_runs`, auditoria (F2.6), 011 (revisores).
- Aparece em: 009, 010, 015, 016, exportações atuais, F3.3.

## Referências

- Position statement on artificial intelligence (AI) use in evidence synthesis across Cochrane, the Campbell Collaboration, JBI, and the Collaboration for Environmental Evidence, 2025. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12594113/

## Perguntas em aberto

1. Na exportação, a declaração vai como aba/arquivo separado ou só como aviso na tela?
