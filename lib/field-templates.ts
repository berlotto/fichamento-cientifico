/**
 * Modelos de campos por tipo de pesquisa (spec 007). Cada modelo cria campos
 * personalizados no projeto, somados aos 6 fixos, com a definição que vai para
 * o prompt da extração. Fonte: docs/pico.md, docs/spider.md e docs/peo.md.
 */

export type TemplateField = { key: string; label: string; instructions: string };

export type FieldTemplate = {
  id: string;
  name: string;
  /** Para que tipo de pergunta serve, em uma frase. */
  summary: string;
  doc: string;
  fields: TemplateField[];
};

const PICO: TemplateField[] = [
  {
    key: "population",
    label: "População",
    instructions: "Quem foram os participantes: número, idade, sexo, condição, critérios de inclusão, local.",
  },
  {
    key: "intervention",
    label: "Intervenção",
    instructions: "O que foi aplicado ao grupo de interesse: descrição, dose, duração, quem aplicou.",
  },
  {
    key: "comparison",
    label: "Comparação",
    instructions: "O que recebeu o grupo controle ou de comparação. \"Sem comparação\" se não houver.",
  },
  {
    key: "outcome",
    label: "Desfecho",
    instructions: "Desfechos medidos (primário e secundários), instrumento e momento da medida.",
  },
];

export const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    id: "pico",
    name: "PICO",
    summary: "Efeito de intervenção, diagnóstico ou prognóstico em estudos quantitativos.",
    doc: "docs/pico.md",
    fields: PICO,
  },
  {
    id: "picos",
    name: "PICOS",
    summary: "PICO com o desenho do estudo; comum em revisões sistemáticas (PRISMA 2020).",
    doc: "docs/pico.md",
    fields: [
      ...PICO,
      {
        key: "study_design",
        label: "Desenho do estudo",
        instructions: "Tipo de estudo declarado pelos autores (ex.: ensaio randomizado, coorte prospectiva).",
      },
    ],
  },
  {
    id: "spider",
    name: "SPIDER",
    summary: "Pesquisa qualitativa e de métodos mistos (experiências, percepções, decisões).",
    doc: "docs/spider.md",
    fields: [
      { key: "sample", label: "Amostra", instructions: "Quem participou: número, perfil, como foram recrutados, local." },
      {
        key: "phenomenon",
        label: "Fenômeno de interesse",
        instructions: "A experiência, percepção, comportamento ou decisão estudada.",
      },
      {
        key: "design",
        label: "Desenho",
        instructions:
          "Como os dados foram coletados (entrevista, grupo focal, observação, documentos) e o referencial metodológico (fenomenologia, teoria fundamentada, etnografia).",
      },
      { key: "evaluation", label: "Avaliação", instructions: "O que foi analisado e os principais achados ou temas." },
      { key: "research_type", label: "Tipo de pesquisa", instructions: "Qualitativa ou mista, como declarado pelos autores." },
    ],
  },
  {
    id: "peo",
    name: "PEO",
    summary: "Estudos observacionais de exposição e desfecho, sem intervenção.",
    doc: "docs/peo.md",
    fields: [
      { key: "population", label: "População", instructions: "Quem foram os participantes: número, perfil, local, período." },
      { key: "exposure", label: "Exposição", instructions: "O fator de exposição, como foi medido e em que níveis." },
      {
        key: "outcome",
        label: "Desfecho",
        instructions:
          "O desfecho observado, como foi medido e a medida de associação relatada (OR, RR, HR) com intervalo de confiança.",
      },
      { key: "confounders", label: "Fatores de confusão", instructions: "Variáveis de ajuste declaradas pelos autores." },
    ],
  },
  {
    id: "pcc",
    name: "PCC",
    summary: "Revisões de escopo: quem, qual conceito e em que contexto.",
    doc: "docs/peo.md",
    fields: [
      { key: "population", label: "População", instructions: "Participantes ou objeto do estudo." },
      { key: "concept", label: "Conceito", instructions: "O conceito central abordado e como o artigo o trata." },
      { key: "context", label: "Contexto", instructions: "País, ambiente, área e período do estudo." },
    ],
  },
];

export const templateById = (id: string) => FIELD_TEMPLATES.find((t) => t.id === id);

/**
 * O que aplicar o modelo acrescenta: só campos com chave que o projeto ainda
 * não tem (os existentes, e o que já foi extraído e revisado neles, ficam).
 */
export function planTemplate(template: FieldTemplate, existing: string[], limit: number) {
  const have = new Set(existing);
  const add = template.fields.filter((f) => !have.has(f.key));
  const room = Math.max(0, limit - existing.length);
  return { add, skipped: template.fields.length - add.length, fits: add.length <= room, room };
}
