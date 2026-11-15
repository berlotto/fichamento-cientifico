# Fichamento e normas ABNT

**Status da doc**: conferida em guias de bibliotecas (IFCE, UniCesumar), não no texto da norma, que é pago. A ABNT não é uma licença: o que vale aqui é seguir as regras.
**Usado em**: specs 001, 002, 015
**Atualizado**: 2026-11-14

## O que é fichamento

Fichamento é o registro organizado da leitura de um texto, feito para que o pesquisador possa usar o conteúdo depois sem reler o original. Não é regulado por uma norma própria da ABNT; o que a ABNT regula são as partes que ele usa: a **referência** (NBR 6023) e as **citações** (NBR 10520).

## Tipos

| Tipo | Conteúdo | No Fichamento |
|---|---|---|
| **Bibliográfico** (ou de referência) | Referência completa da obra e, em alguns manuais, descrição geral (autores, métodos, argumentos) | Metadados via Crossref + referência ABNT/APA/Vancouver/BibTeX |
| **De citação** (ou de transcrição) | Trechos literais importantes, entre aspas, sempre com a página | Trecho de cada campo; citações à mão (spec 002) |
| **De conteúdo** (resumo, paráfrase) | Síntese das ideias com as palavras do leitor | Campos extraídos (objetivo, método, resultados…) |
| **Crítico** (ou de comentário) | Análise e opinião do leitor: concordância, crítica, ligação com a própria pesquisa | "Minhas notas"; comentário crítico (spec 001) |

Os manuais recomendam combinar os tipos. Erros comuns de iniciante: não registrar a página e perder os dados bibliográficos.

## Estrutura usual de uma ficha

1. **Cabeçalho:** referência completa (NBR 6023), às vezes com tema/assunto e local onde a obra está.
2. **Corpo:** citações com página e/ou resumo, na ordem do texto.
3. **Comentário:** análise crítica do leitor, separada do conteúdo do autor.

## NBR 6023:2018 (referências)

Artigo de periódico, forma geral:

> SOBRENOME, Prenome abreviado; SOBRENOME, Prenome. Título do artigo: subtítulo. **Nome do periódico**, local, v. X, n. Y, p. inicial-final, mês abrev. ano. DOI: https://doi.org/...

- Até três autores: todos. Quatro ou mais: a norma permite listar todos ou o primeiro seguido de *et al.*
- O destaque (negrito) vai no nome do periódico.
- O Fichamento implementa em `lib/citation.ts` (`abntParts`).

## NBR 10520:2023 (citações)

Publicada em julho de 2023, substituiu a de 2002. As referências continuam em caixa alta pela NBR 6023; a mudança de caixa vale só para as citações no texto.

| Regra | Como fica | Fonte |
|---|---|---|
| Sobrenome (pessoa física) | Só a inicial maiúscula, também entre parênteses: (Lopes, 2020, p. 15). Na versão de 2002 era (LOPES, 2020, p. 15) | IFCE, UniCesumar |
| Pessoa jurídica | Por extenso em maiúsculas e minúsculas, ou sigla em maiúsculas: (Instituto Brasileiro de Geografia e Estatística, 2011, p. 3) ou (IBGE, 2011, p. 3) | IFCE |
| Quatro ou mais autores | Pode usar *et al.* (em itálico) após o primeiro autor, mesmo que a referência liste todos, ou citar todos: Monteiro *et al.* (2008, p. 57) | IFCE, UniCesumar |
| Citação direta | Indicar página (p.) ou localização (local.), se houver: (Bardin, 2011, p. 28) · (Dongo-Montoya, 2009, local. 264) | IFCE |
| Documento sem paginação | Indicar a localização como consta no documento: (Brasil, 1999, cap. V, art. 49, inc. I) · (Cidade [...], 2002, 9min 41s) | IFCE |
| Volume, tomo, seção (livros) | Indicar se houver: (Sesc, 2023, v. 8, p. 21). Volume e número de periódico **não** se indicam | IFCE |
| Direta longa (mais de 3 linhas) | Recuo da margem esquerda (4 cm passou a ser **recomendação**), espaçamento simples, fonte menor que a do texto, sem aspas | IFCE |
| Direta curta (até 3 linhas) | No parágrafo, entre aspas duplas | (regra mantida) |
| Ponto final | Encerra a frase, depois da chamada: "[...] filhos [...]" (Dongo-Montoya, 2009, local. 264). | IFCE |
| Fontes informais e pesquisas em andamento | Mencionar no texto ou em nota de rodapé | IFCE |
| Supressão, interpolação, destaque | [...] supressão; [ ] acréscimo; "grifo nosso" / "grifo do autor" | (regra mantida) |
| Citação de citação | apud: (Silva, 2020 apud Souza, 2023, p. 10) | (regra mantida) |

**Para o código:** `lib/citation.ts` tem `shortCite(article, upper)`, com opção de maiúsculas. Pela regra de 2023, o padrão das citações deve ser **sem** maiúsculas, e as referências (NBR 6023, `abntParts`) continuam em caixa alta. Para artigo de periódico, a citação não leva volume nem número.

## Cobertura no Fichamento

| Item | Status |
|---|---|
| Referência ABNT NBR 6023 (artigo de periódico) | ✅ |
| Fichamento de conteúdo (campos extraídos com trecho e página) | ✅ |
| Fichamento de citação: trechos dos campos | ✅ |
| Fichamento de citação: trechos escolhidos pelo pesquisador (spec 002) | ⬜ |
| Fichamento crítico estruturado (spec 001) | ⬜ (há só "Minhas notas") |
| Citação direta com página no formato NBR 10520:2023 (sobrenome só com inicial maiúscula) | ⬜ (conferir `shortCite`) |
| *et al.* com 4+ autores | ⬜ |
| Localização em documento sem paginação | ⬜ |
| Citação direta longa em bloco recuado (spec 015) | ⬜ |
| Ficha completa como documento (spec 015) | ⬜ |
| Referência de outros tipos (livro, capítulo, tese) | ⬜ |

## Referências

- ABNT. **NBR 6023**: informação e documentação: referências: elaboração. Rio de Janeiro: ABNT, 2018.
- ABNT. **NBR 10520**: informação e documentação: citações em documentos: apresentação. Rio de Janeiro: ABNT, 2023.
- IFCE. Anexo: atualizações da ABNT NBR 10520/2023 (citações). https://portal.ifce.edu.br/documents/3352/ANEXO_-__Atualiza%C3%A7%C3%B5es_da_ABNT_NBR_10520-2023.pdf
- UniCesumar. NBR 10520: atualizações. https://rdu.unicesumar.edu.br/bitstream/123456789/9937/1/NBR%2010520%20-%20Atualiza%c3%a7%c3%b5es
- Toda Matéria. Fichamento: como fazer, tipos e modelos. https://todamateria.com.br/fichamento/
- Acessa.com. Trabalhos acadêmicos sem dificuldade: fichamentos. https://www.acessa.com/educacao/arquivo/pesquisa/2015/12/24-trabalhos-academicos-sem-dificuldade-fichamentos/
- Doutora Nathalia. Fichamento de artigo científico: como fazer. https://doutoranathalia.com.br/blog/fichamento-artigo-cientifico-como-fazer/
