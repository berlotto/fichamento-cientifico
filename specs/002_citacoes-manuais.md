# 1.2 Citações marcadas à mão

**Spec**: 002_citacoes-manuais.md
**Status**: done (aguardando validação do usuário; R7 parcial, Word/PDF depende da 015)
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
| R1 | Tabela `quotes` (article_id, text, pdf_page, printed_page, comment, created_at) com RLS | ✅ |
| R2 | Seleção de texto no painel do visualizador com ação "Guardar citação" (mouse e toque) | ✅ |
| R3 | Página impressa calculada com `printed-page.ts` | ✅ |
| R4 | Seção "Minhas citações" na ficha, ordenada por página, com editar comentário e excluir | ✅ |
| R5 | Link para o visualizador com o trecho destacado (reaproveitar `findQuoteRange`) | ✅ |
| R6 | Citação direta formatada por norma (ABNT, APA, Vancouver) com copiar | ✅ |
| R7 | Exportação das citações (lista por artigo no xlsx e na ficha Word/PDF) | 🔄 |
| R8 | Limite de citações por artigo e de tamanho do trecho | ✅ |

## Critérios de Aceite

- [x] Selecionar um trecho que atravessa uma quebra de linha grava o texto contínuo e a página certa
- [x] Abrir a citação pelo link destaca o trecho certo no visualizador
- [x] A citação ABNT sai com sobrenome, ano e página impressa; sem página impressa, usa a do PDF e avisa
- [x] Reextrair o artigo não apaga citações
- [ ] Funciona no celular (seleção por toque): implementado, falta testar num aparelho

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

## Perguntas em aberto (respondidas na implementação)

1. ~~PDF.js já?~~ Não: o painel de texto basta por agora.
2. ~~Mais de uma página?~~ Não na primeira versão.
3. ~~Limite?~~ 200 citações por artigo, 2 000 caracteres por trecho e por comentário.

## Decisões tomadas na implementação (2026-11-15)

- **Tabela `quotes`** (migração `20261115000000_quotes.sql`). RLS pelo dono do artigo. Depois de gravada, só o comentário muda: trecho, página e artigo não aceitam `update` (grant por coluna). O limite de 200 por artigo é um trigger com advisory lock, para valer com inserções simultâneas.
- **Seleção** (`viewer/[articleId]/selectable-text.tsx`): botão flutuante abaixo da seleção (no celular o menu nativo fica acima), painel no rodapé com o trecho e o comentário. `onPointerDown` evita que o toque desfaça a seleção.
- **Texto contínuo** (`lib/quotes.ts`): quebras viram espaço e a hifenização de fim de linha some só entre minúsculas ("glau-⏎coma" → "glaucoma"), para não estragar "COVID-19" ou "pós-Graduação". Antes de gravar, o trecho é conferido no texto da página, ignorando espaços e pontuação. Se não estiver lá, é recusado (por exemplo, quando a seleção pega rótulos da tela). O mesmo trecho na mesma página não duplica.
- **Destaque no visualizador**: o link `?p=N&c=<id>#trecho` destaca a citação aberta, e as outras citações da página aparecem sublinhadas.
- **Chamada por norma** (`inTextCite` e `directQuote` em `lib/citation.ts`):
  - ABNT: (Silva; Souza; Lima, 2023, p. 45).
  - APA: (Silva & Souza, 2023, p. 45) e (Silva et al., 2023, p. 45).
  - Vancouver: [n, p. 45], com aviso para trocar n pelo número da referência.
  - Citação curta vai entre aspas. A longa vai sem aspas, para virar bloco: na ABNT, mais de cerca de 240 caracteres (aproximação de três linhas); na APA, 40 palavras ou mais.
- **Correção da ABNT**: `shortCite` usava *et al.* já com três autores. Pela NBR 10520:2023, até três autores entram todos e *et al.* só vale com quatro ou mais. Isso muda também a matriz e as listas.
- **Exportação**: com "Incluir minha análise crítica", o Excel e o CSV ganham a coluna "Minhas citações", no formato “trecho” (p. X) — comentário. O backup JSON passa à versão 4, com `quotes`. A ficha em Word/PDF fica para a spec 015.
- **Testes**:
  - Unitários: seleção, conferência, chamadas e exportação.
  - Integração: RLS, colunas imutáveis, limites, independência da reextração e cascata.
  - Navegador: seleção em duas linhas, gravação com página impressa 215, card na ficha, "Ver no PDF" com destaque e recusa de seleção curta.
