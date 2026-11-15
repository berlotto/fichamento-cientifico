# 5.2 Exportação em Markdown e RIS

**Spec**: 016_export-markdown-ris.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Muitos pesquisadores mantêm suas notas no Obsidian, Notion ou Logseq (Markdown) e gerenciam referências no Zotero, Mendeley ou EndNote. O Fichamento exporta BibTeX, que o Zotero lê, mas o EndNote e várias ferramentas de revisão sistemática (Covidence, Rayyan) trabalham com RIS. Ver `docs/ris.md`.

## Descrição

1. **Markdown:** um arquivo `.md` por artigo, com frontmatter YAML (citekey, título, autores, ano, DOI, tags) e as seções da ficha (campos, citações, análise crítica). Exportação do projeto em `.zip`.
2. **RIS:** exportação das referências do projeto em RIS, com DOI, resumo e palavras-chave.
3. **Importação RIS:** ler um arquivo RIS para criar registros (usada pela triagem, spec 008).

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Gerador de Markdown com frontmatter YAML e nomes de arquivo pelo citekey | ⬜ |
| R2 | Exportação do projeto em .zip (reaproveitar `fflate`) | ⬜ |
| R3 | Links do Obsidian entre artigos que se citam (`[[citekey]]`), se a spec 012 existir | ⬜ |
| R4 | Gerador RIS conforme `docs/ris.md` (TY primeiro, ER por último, UTF-8) | ⬜ |
| R5 | Parser RIS tolerante (variações de tags entre bases) com testes de arquivos do Scopus, Web of Science e PubMed | ⬜ |
| R6 | Escapar texto do usuário e do PDF (YAML e RIS) | ⬜ |

## Critérios de Aceite

- [ ] O .zip aberto como cofre do Obsidian mostra as fichas com propriedades e tags
- [ ] O RIS exportado é importado no Zotero e no EndNote sem perder autores, ano, DOI e resumo
- [ ] Título com dois-pontos ou aspas não quebra o YAML
- [ ] Arquivos RIS reais de três bases são lidos sem erro

## Fora do Escopo

- Sincronização contínua com Obsidian ou Notion
- Integração Zotero por API (F3.1, no plano)

## Notas Técnicas

- No YAML, sempre citar strings; não confiar em escapamento manual.
- RIS: usar `AU` (um por linha), `PY`, `TI`, `T2`/`JO` para periódico, `DO` para DOI. As bases usam tags de forma inconsistente; o parser deve aceitar `A1`/`AU`, `T1`/`TI`, `JO`/`JF`/`T2`.

## Dependências

- Usa: 001, 002, 003 para o conteúdo do Markdown.
- Usada por: 008 (importação RIS).

## Perguntas em aberto

1. Obsidian é o alvo principal do Markdown, ou algum outro (Notion, Logseq)?
