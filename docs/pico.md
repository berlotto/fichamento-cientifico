# PICO (e variantes PICOS, PICOT, PICOC)

**Status da doc**: rascunho
**Usado em**: spec 007 (modelos de campos)
**Atualizado**: 2026-11-14

## O que é

PICO é uma estrutura para formular uma pergunta de pesquisa clínica "bem construída", dividindo-a em quatro componentes. Foi proposta por Richardson e colegas em 1995 e é a estrutura mais usada em medicina baseada em evidências e em revisões sistemáticas de intervenção (Cochrane, PRISMA). Serve para três coisas: formular a pergunta, montar a estratégia de busca e definir os critérios de elegibilidade e os dados a extrair.

## Componentes

| Letra | Componente | Pergunta que responde | Exemplo |
|---|---|---|---|
| **P** | Population / Patient / Problem | Quem são os participantes? Qual a condição? | Adultos com diabetes tipo 2 |
| **I** | Intervention | O que é feito (tratamento, exposição, teste)? | Programa de exercício supervisionado |
| **C** | Comparison / Control | Com o que se compara? | Cuidado usual |
| **O** | Outcome | Que resultado é medido? | HbA1c em 6 meses |

Exemplo de pergunta: "Em adultos com diabetes tipo 2 (P), um programa de exercício supervisionado (I), comparado ao cuidado usual (C), reduz a HbA1c em 6 meses (O)?"

## Variantes

| Variante | Letra extra | Uso |
|---|---|---|
| **PICOS** | **S** = Study design (desenho do estudo) | Revisões sistemáticas; o PRISMA 2020 cita PICO e PICOS ao descrever critérios de elegibilidade |
| **PICOT** | **T** = Time (tempo de seguimento) | Enfermagem e pesquisa clínica |
| **PICOC** | **C** = Context (contexto) | Ciências sociais, engenharia de software (Petticrew e Roberts, 2006) |
| **PICo** | Population, phenomenon of Interest, Context | Pesquisa qualitativa (JBI) |

## Quando usar e quando não

- **Bom para:** perguntas de efeito de intervenção, diagnóstico e prognóstico, em estudos quantitativos.
- **Ruim para:** pesquisa qualitativa (sem "intervenção" nem "comparação"); usar SPIDER ou PICo. Em estudos de exposição sem intervenção, usar PEO.

## Campos no Fichamento (modelo PICO/PICOS, spec 007)

| Chave | Nome | Definição para o extrator |
|---|---|---|
| `population` | População | Quem foram os participantes: número, idade, sexo, condição, critérios de inclusão, local. |
| `intervention` | Intervenção | O que foi aplicado ao grupo de interesse: descrição, dose, duração, quem aplicou. |
| `comparison` | Comparação | O que recebeu o grupo controle ou de comparação. "Sem comparação" se não houver. |
| `outcome` | Desfecho | Desfechos medidos (primário e secundários), instrumento e momento da medida. |
| `study_design` | Desenho do estudo (PICOS) | Tipo de estudo declarado pelos autores (ex.: ensaio randomizado, coorte prospectiva). |

## Cobertura no Fichamento

| Item | Status |
|---|---|
| Campo P (população) | ⬜ |
| Campo I (intervenção) | ⬜ |
| Campo C (comparação) | ⬜ |
| Campo O (desfecho) | ⬜ |
| Campo S (desenho, PICOS) | ⬜ |
| Variante PICOT (tempo) | ⬜ |
| Variante PICOC (contexto) | ⬜ |
| Pergunta PICO do projeto (para triagem, spec 008) | ⬜ |

## Licença

Estrutura conceitual, sem restrição de uso.

## Referências

- Richardson WS, Wilson MC, Nishikawa J, Hayward RS. The well-built clinical question: a key to evidence-based decisions. *ACP Journal Club*. 1995;123(3):A12–A13.
- Petticrew M, Roberts H. *Systematic Reviews in the Social Sciences: A Practical Guide*. Oxford: Blackwell, 2006.
- Higgins JPT et al. (eds.). *Cochrane Handbook for Systematic Reviews of Interventions*, cap. 3. https://training.cochrane.org/handbook
