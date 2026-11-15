import { describe, expect, it } from "vitest";
import { buildCsv } from "./xlsx";
import { countItems, tagMarkdown, tagRows, type TagContent } from "./tag-export";

const content: TagContent = {
  tag: { id: "t", name: "Limitação amostral", description: "Amostras pequenas ou de um centro só" },
  articles: [
    {
      id: "a1",
      displayTitle: "Exercício e glicemia",
      authors: [{ family: "Silva", given: "Ana" }],
      year: 2023,
      items: [
        { kind: "article", taggedTag: "Limitação amostral" },
        {
          kind: "field",
          taggedTag: "Tamanho",
          fieldKey: "method",
          label: "Método",
          value: "Ensaio com 40 pacientes",
          quote: "forty patients",
          pdfPage: 2,
          printedPage: "215",
        },
        {
          kind: "quote",
          taggedTag: "Limitação amostral",
          quoteId: "q1",
          text: "=a amostra foi pequena",
          pdfPage: 3,
          printedPage: null,
          comment: "admitem",
        },
      ],
    },
  ],
};

describe("conteúdo de um tema", () => {
  it("conta os trechos", () => {
    expect(countItems(content)).toBe(3);
  });

  it("Markdown com chamada ABNT e página (impressa ou do PDF)", () => {
    const md = tagMarkdown(content);
    expect(md).toContain("# Limitação amostral");
    expect(md).toContain("## Exercício e glicemia (Silva, 2023)");
    expect(md).toContain("- **Método** _(Tamanho)_: Ensaio com 40 pacientes");
    expect(md).toContain("> “forty patients” (Silva, 2023, p. 215)");
    expect(md).toContain("> “=a amostra foi pequena” (Silva, 2023, p. 3)");
    expect(md).toContain("Comentário: admitem");
  });

  it("planilha com uma linha por trecho, e CSV neutraliza fórmulas", () => {
    const { rows, widths } = tagRows(content);
    expect(rows).toHaveLength(4);
    expect(rows[0].length).toBe(widths.length);
    expect(rows[2]).toContain("(Silva, 2023, p. 215)");
    expect(buildCsv(rows)).toContain("'=a amostra foi pequena");
  });
});
