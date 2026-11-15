# 1.2 Citações marcadas à mão

**Spec**: 002_citacoes-manuais.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

O LLM extrai seis campos fixos e os personalizados, mas o pesquisador sempre encontra trechos que interessam à pesquisa dele e que nenhum campo pega: uma definição, um dado, uma frase boa para citação direta. Hoje ele precisaria copiar o trecho para "Minhas notas" e anotar a página à mão, que é exatamente o erro clássico do fichamento (esquecer a página).

O visualizador (`/viewer/[articleId]`) já mostra o texto extraído de cada página ao lado do PDF, e `verify.ts` já localiza trechos no texto. Uma citação marcada pelo próprio pesquisador sai do texto do PDF, então já nasce verificada.

## Descrição

1. No painel de texto do visualizador, o pesquisador seleciona um trecho e escolhe "Guardar citação".
2. A citação guarda: trecho literal, página do PDF, página impressa (pela heurística que já existe), e um comentário opcional.
3. As citações aparecem numa seção "Minhas citações" na ficha, em ordem de página, com link que abre o visualizador com o trecho destacado.
4. Cada citação mostra a citação direta pronta no padrão do projeto (ABNT NBR 10520:2023: Sobrenome, ano, p. X), com botão copiar.
5. A citação pode receber tags (spec 003).

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Tabela `quotes` (article_id, text, pdf_page, printed_page, comment, created_at) com RLS | ⬜ |
| R2 | Seleção de texto no painel do visualizador com ação "Guardar citação" (mouse e toque) | ⬜ |
| R3 | Página impressa calculada com `printed-page.ts` | ⬜ |
| R4 | Seção "Minhas citações" na ficha, ordenada por página, com editar comentário e excluir | ⬜ |
| R5 | Link para o visualizador com o trecho destacado (reaproveitar `findQuoteRange`) | ⬜ |
| R6 | Citação direta formatada por norma (ABNT, APA, Vancouver) com copiar | ⬜ |
| R7 | Exportação das citações (lista por artigo no xlsx e na ficha Word/PDF) | ⬜ |
| R8 | Limite de citações por artigo e de tamanho do trecho | ⬜ |

## Critérios de Aceite

- [ ] Selecionar um trecho que atravessa uma quebra de linha grava o texto contínuo e a página certa
- [ ] Abrir a citação pelo link destaca o trecho certo no visualizador
- [ ] A citação ABNT sai com sobrenome, ano e página impressa; sem página impressa, usa a do PDF e avisa
- [ ] Reextrair o artigo não apaga citações
- [ ] Funciona no celular (seleção por toque)

## Fora do Escopo

- Seleção direto no PDF renderizado (o visualizador usa o leitor do navegador em iframe; seleção no PDF exige PDF.js)
- Trecho que atravessa duas páginas (primeira versão: uma página por citação)
- Imagens, tabelas e figuras

## Fluxo do Usuário

1. Na ficha, clica na página de um campo e abre o visualizador.
2. No painel de texto, seleciona uma frase.
3. Aparece um botão flutuante "Guardar citação"; ao clicar, pode escrever um comentário curto.
4. Volta à ficha e vê a citação em "Minhas citações", com "(Silva, 2023, p. 45)" e botão copiar.

## Notas Técnicas

- A seleção é no texto extraído (`article_pages`), não no PDF. Guardar o texto como foi selecionado e conferir com `locateQuote` antes de gravar; se não localizar (ex.: seleção pegou rótulos da UI), recusar.
- O formato da citação direta deve vir de `lib/citation.ts`, para manter uma fonte só por norma.
- Conferir se a NBR 10520:2023 é a regra usada (ver `docs/fichamento-abnt.md`).

## Dependências

- Usa: visualizador (F0.9), `verify.ts`, `printed-page.ts`, `lib/citation.ts`.
- Usada por: 003 (tags), 015 (ficha Word/PDF), 016 (Markdown).

## Perguntas em aberto

1. Vale a pena já usar PDF.js para selecionar direto no PDF, ou o painel de texto basta por agora?
2. Citação de mais de uma página é necessária na primeira versão?
3. Qual limite por artigo (sugestão: 200 citações, 2 000 caracteres cada)?
