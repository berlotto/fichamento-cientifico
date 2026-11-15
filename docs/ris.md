# RIS (Research Information Systems)

**Status da doc**: rascunho
**Usado em**: specs 008 (importação) e 016 (exportação)
**Atualizado**: 2026-11-14

## O que é

RIS é um formato de texto para trocar **referências bibliográficas** entre programas. Foi criado pela Research Information Systems (empresa do Reference Manager, hoje parte da Clarivate) e é lido e escrito por praticamente todos os gerenciadores de referências (EndNote, Zotero, Mendeley) e pelas bases (Scopus, Web of Science, PubMed via conversão, Embase), além das ferramentas de revisão sistemática (Covidence, Rayyan).

Comparado ao BibTeX (que o Fichamento já exporta), o RIS é o padrão do EndNote e das ferramentas de revisão; o BibTeX é o padrão do LaTeX.

## Estrutura

- Um arquivo tem um ou mais registros.
- Cada linha é uma **tag** de duas letras maiúsculas (ou letra e dígito), **dois espaços**, hífen, um espaço e o valor: `TY  - JOUR`.
- `TY` é obrigatoriamente a **primeira** tag do registro e `ER` a **última** (`ER  - `, com valor vazio).
- Tags repetíveis (autor, palavra-chave) ocupam uma linha cada.
- Há duas versões principais da especificação (2001 e 2011), com listas de tags diferentes por tipo; na prática, cada base usa as tags de um jeito.

Exemplo:

```
TY  - JOUR
AU  - Silva, Maria A.
AU  - Souza, João
TI  - Título do artigo
T2  - Revista Brasileira de Exemplo
PY  - 2023
VL  - 12
IS  - 3
SP  - 45
EP  - 60
DO  - 10.1234/rbe.2023.045
AB  - Resumo do artigo.
KW  - fichamento
KW  - revisão
LA  - por
UR  - https://doi.org/10.1234/rbe.2023.045
ER  - 
```

## Tipos de referência (TY) mais usados

| Código | Tipo |
|---|---|
| `JOUR` | Artigo de periódico |
| `BOOK` | Livro |
| `CHAP` | Capítulo de livro |
| `CONF` / `CPAPER` | Anais / trabalho de conferência |
| `THES` | Tese ou dissertação |
| `RPRT` | Relatório |
| `ELEC` | Página web |
| `GEN` | Genérico |

## Tags principais

| Tag | Campo | Observação |
|---|---|---|
| `TY` | Tipo | Primeira linha, obrigatória |
| `AU` / `A1` | Autor principal | Um por linha, "Sobrenome, Nome". Bases usam `AU` ou `A1` |
| `A2` | Autor secundário (editor) | |
| `TI` / `T1` | Título principal | |
| `T2` | Título secundário | Em `JOUR`, costuma ser o nome do periódico |
| `JO` / `JF` / `JA` | Periódico | `JF` nome completo, `JA` abreviado; `JO` é usado para ambos, conforme a base |
| `PY` | Ano | `AAAA` (às vezes `AAAA/MM/DD/`) |
| `DA` | Data | `AAAA/MM/DD` |
| `VL` | Volume | |
| `IS` | Número | |
| `SP` | Página inicial | Algumas bases põem o intervalo inteiro aqui |
| `EP` | Página final | |
| `DO` | DOI | Sem prefixo `https://doi.org/` de preferência |
| `SN` | ISSN/ISBN | |
| `AB` | Resumo | |
| `KW` | Palavra-chave | Uma por linha |
| `LA` | Idioma | |
| `PB` | Editora | |
| `CY` | Local de publicação | |
| `UR` | URL | |
| `N1` | Notas | Onde o Fichamento pode pôr tags ou comentário |
| `ID` | Identificador do registro | Pode receber o citekey |
| `DB` | Base de origem | Útil para o PRISMA (registros por fonte) |
| `ER` | Fim do registro | Última linha, obrigatória |

## Cuidados

- **Codificação:** gerar em UTF-8 (com BOM, para o EndNote no Windows reconhecer acentos); aceitar UTF-8 e Latin-1 na leitura.
- **Quebras de linha:** gerar CRLF; aceitar LF e CRLF.
- **Valores com quebra de linha** (resumo): manter numa linha só ao gerar; na leitura, juntar linhas de continuação (linha sem tag) ao valor anterior.
- **Inconsistência entre bases:** o parser deve mapear sinônimos (`A1`/`AU`, `T1`/`TI`, `JO`/`JF`/`T2`) e não falhar com tag desconhecida.

## Cobertura no Fichamento

| Item | Status |
|---|---|
| Exportação: `TY` primeiro e `ER` último, UTF-8 | ⬜ |
| Exportação: autores, título, periódico, ano, volume, número, páginas, DOI | ⬜ |
| Exportação: resumo, palavras-chave, idioma, URL | ⬜ |
| Exportação: tags e comentário em `N1`, citekey em `ID` | ⬜ |
| Importação: parser com sinônimos de tags e linhas de continuação | ⬜ |
| Importação: testes com arquivos reais do Scopus, Web of Science e PubMed | ⬜ |
| Importação: base de origem (`DB`) para o PRISMA | ⬜ |

## Licença

Formato aberto de uso livre.

## Referências

- RIS (file format). Wikipedia. https://en.wikipedia.org/wiki/RIS_(file_format)
- gris: RIS file format specification. https://gris.readthedocs.io/en/latest/specification.html
- RefDB manual, Writing RIS datasets. https://refdb.sourceforge.net/manual-0.9.6/sect1-ris-format.html
