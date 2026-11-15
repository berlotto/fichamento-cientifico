import { describe, expect, it } from "vitest";
import { definitionCite, glossaryMarkdown, glossaryRows, type GlossaryConcept, type GlossaryDefinition } from "./glossary-export";

const article = { id: "a1", displayTitle: "Resiliência em adolescentes", authors: [{ family: "Silva" }], year: 2023 };

const def = (over: Partial<GlossaryDefinition>): GlossaryDefinition => ({
  id: "d",
  text: "Resilience is the capacity to adapt",
  text_translated: "Resiliência é a capacidade de se adaptar",
  pdf_page: 2,
  printed_page: "45",
  origin: "own",
  cited_ref: null,
  kind: "definition",
  verified: true,
  status: "accepted",
  source: "llm",
  article,
  ...over,
});

const concepts: GlossaryConcept[] = [
  {
    id: "c",
    name: "Resiliência",
    notes: null,
    definitions: [
      def({ id: "d1" }),
      def({ id: "d2", origin: "cited", cited_ref: "Masten, 2001", status: "pending" }),
      def({ id: "d3", status: "rejected", text: "rejeitada" }),
    ],
  },
];

describe("glossário (spec 006)", () => {
  it("chamada ABNT; definição citada usa apud", () => {
    expect(definitionCite(def({}))).toBe("(Silva, 2023, p. 45)");
    expect(definitionCite(def({ origin: "cited", cited_ref: "Masten, 2001" }))).toBe("(Masten, 2001 apud Silva, 2023, p. 45)");
  });

  it("Markdown agrupa por conceito e deixa as rejeitadas de fora", () => {
    const md = glossaryMarkdown("Tese", concepts);
    expect(md).toContain("## Resiliência");
    expect(md).toContain("“Resilience is the capacity to adapt” (Silva, 2023, p. 45)");
    expect(md).toContain("(Masten, 2001 apud Silva, 2023, p. 45)");
    expect(md).toContain("a revisar");
    expect(md).not.toContain("rejeitada");
  });

  it("planilha com uma linha por definição não rejeitada", () => {
    const { rows, widths } = glossaryRows(concepts);
    expect(rows).toHaveLength(3);
    expect(rows[0].length).toBe(widths.length);
    expect(rows[2]).toContain("Citada");
  });
});
