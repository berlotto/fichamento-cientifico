# 4.1 Referências e bola de neve

**Spec**: 012_referencias-bola-de-neve.md
**Status**: draft
**Data**: 2026-11-14

## Contexto

Uma das formas mais eficazes de achar artigos é a "bola de neve": olhar as referências de um artigo bom (para trás) e quem o cita (para frente). O Crossref traz a lista de referências de muitos artigos com DOI e o OpenAlex traz referências e citações. O pesquisador hoje faz isso fora da ferramenta.

## Descrição

1. Na ficha, aba "Referências": lista das referências do artigo (Crossref/OpenAlex pelo DOI), com marca para as que já estão no projeto.
2. Aba "Citado por": artigos que citam este (OpenAlex), ordenados por ano ou número de citações.
3. Ação "Adicionar ao projeto": importa pelo DOI (busca o PDF em acesso aberto quando houver, com a importação por URL que já existe; sem PDF, entra só com metadados se a spec 008 estiver feita).
4. No projeto, uma visão "Mais citados pelo projeto": referências que aparecem em vários artigos do projeto e ainda não estão nele.

## Requisitos

| ID | Requisito | Status |
|---|---|---|
| R1 | Busca de referências por DOI (Crossref, OpenAlex como reserva), com cache | ⬜ |
| R2 | Busca de "citado por" no OpenAlex | ⬜ |
| R3 | Marca "já no projeto" por DOI | ⬜ |
| R4 | Adicionar ao projeto com PDF em acesso aberto quando existir | ⬜ |
| R5 | Visão "Mais citados pelo projeto" | ⬜ |
| R6 | Origem "busca por citação" registrada (para o PRISMA, spec 009) | ⬜ |
| R7 | Limite de chamadas às APIs e User-Agent genérico (sem dados do usuário) | ⬜ |

## Critérios de Aceite

- [ ] Artigo sem DOI mostra "referências indisponíveis", sem erro
- [ ] Referência que já está no projeto aparece marcada e não é importada de novo
- [ ] Nenhuma chamada externa leva e-mail ou nome do usuário
- [ ] A lista carrega em menos de 3 s com cache quente

## Fora do Escopo

- Extrair referências do PDF quando o Crossref não as tem (exige parser de referências)
- Grafo visual de citações

## Notas Técnicas

- OpenAlex pede e-mail no `mailto` para o "polite pool": usar um e-mail do serviço, nunca o do usuário.
- Guardar referências numa tabela (`article_references`) para a visão "mais citados" sem chamar a API toda vez.
- Acesso aberto: o OpenAlex traz `open_access.oa_url`; respeitar os limites da importação por URL (50 MB, 30 s, bloqueio de IP interno).

## Dependências

- Usa: importação por URL, metadados Crossref (F1.2).
- Alimenta: 009 (outros métodos), 014 (duplicatas).

## Perguntas em aberto

1. "Citado por" é útil para o seu público ou só as referências bastam?
2. Sem a spec 008, um artigo sem PDF em acesso aberto não pode entrar. Aceitável?
