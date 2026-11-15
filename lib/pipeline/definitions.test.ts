import { describe, expect, it } from "vitest";
import { buildDefinitionRows, matchConcept } from "./definitions";

const concepts = [
  { id: "c1", name: "Resiliência" },
  { id: "c2", name: "adesão ao tratamento" },
];

const pages = [
  {
    pdf_page: 1,
    printed_page: "10",
    text: "Introdução. Resilience is defined as the capacity to adapt successfully to adversity (Masten, 2001).",
  },
  {
    pdf_page: 2,
    printed_page: "11",
    text: "Métodos. A adesão ao tratamento foi medida pela escala de Morisky com oito itens.",
  },
];

const base = { quote_translated: null, pdf_page: null, origin: "own" as const, cited_ref: null, kind: "definition" as const };

describe("definições (spec 006)", () => {
  it("casa o conceito sem diferenciar maiúsculas e acentos", () => {
    expect(matchConcept("RESILIENCIA", concepts)?.id).toBe("c1");
    expect(matchConcept("letramento", concepts)).toBeUndefined();
  });

  it("confere o trecho, acha a página e descarta conceito fora da lista", () => {
    const rows = buildDefinitionRows(
      [
        {
          ...base,
          concept: "Resiliência",
          quote: "Resilience is defined as the capacity to adapt successfully to adversity",
          quote_translated: "Resiliência é definida como a capacidade de se adaptar bem à adversidade",
          origin: "cited",
          cited_ref: "Masten, 2001",
        },
        {
          ...base,
          concept: "adesão ao tratamento",
          quote: "A adesão ao tratamento foi medida pela escala de Morisky com oito itens.",
          kind: "operationalization",
        },
        { ...base, concept: "letramento", quote: "Introdução. Resilience is defined as the capacity" },
        { ...base, concept: "Resiliência", quote: "Resiliência é um conceito que inventei agora mesmo aqui" },
      ],
      concepts,
      pages,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ concept_id: "c1", pdf_page: 1, printed_page: "10", origin: "cited", cited_ref: "Masten, 2001", verified: true });
    expect(rows[1]).toMatchObject({ concept_id: "c2", pdf_page: 2, kind: "operationalization", verified: true });
    // Trecho que não está no texto: fica, mas não conferido e sem página.
    expect(rows[2]).toMatchObject({ concept_id: "c1", verified: false, pdf_page: null });
  });

  it("não repete o que já foi revisado nem duplica na mesma resposta", () => {
    const q = "A adesão ao tratamento foi medida pela escala de Morisky com oito itens.";
    const rows = buildDefinitionRows(
      [
        { ...base, concept: "adesão ao tratamento", quote: q },
        { ...base, concept: "adesão ao tratamento", quote: q.toUpperCase() },
      ],
      concepts,
      pages,
      [{ concept_id: "c2", text: q }],
    );
    expect(rows).toEqual([]);
  });

  it("referência citada só quando a origem é citada", () => {
    const [row] = buildDefinitionRows(
      [{ ...base, concept: "Resiliência", quote: "Resilience is defined as the capacity to adapt", cited_ref: "X" }],
      concepts,
      pages,
    );
    expect(row.cited_ref).toBeNull();
  });
});
