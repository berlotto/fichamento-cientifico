import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { tableRows } = await import("./project-table");
const { buildCsv } = await import("./xlsx");
type Table = Parameters<typeof tableRows>[0];

const table: Table = {
  name: "P",
  defs: [{ key: "method", label: "Método", custom: false }],
  articles: [
    {
      id: "1",
      title: "Um estudo",
      subtitle: null,
      original_filename: null,
      authors: [{ family: "Silva", given: "Ana" }],
      year: 2023,
      venue: "Revista",
      volume: null,
      issue: null,
      pages: null,
      doi: null,
      language: "pt",
      citekey: null,
      status: "verified",
      fields: {
        method: {
          value: "Ensaio",
          quote: "trial",
          quote_translated: null,
          pdf_page: 2,
          printed_page: "15",
          verified: true,
          status: "accepted",
        },
      },
      comments: { method: "=amostra pequena" },
      crit_strengths: "claro",
      crit_weaknesses: null,
      crit_relevance: "cap. 2",
      notes: null,
      quotes: [
        { text: "a amostra foi pequena", pdf_page: 3, printed_page: "16", comment: "limitação" },
        { text: "sem grupo controle", pdf_page: 1, printed_page: null, comment: null },
      ],
    },
  ],
};

describe("tableRows com análise crítica (spec 001)", () => {
  it("sem a opção, não traz colunas de comentário", () => {
    const { rows, widths } = tableRows(table);
    expect(rows[0]).not.toContain("Método: meu comentário");
    expect(rows[0]).not.toContain("Pontos fortes");
    expect(rows[0].length).toBe(widths.length);
  });

  it("com a opção, põe o comentário ao lado do campo e a análise no fim", () => {
    const { rows, widths } = tableRows(table, { critique: true });
    const [header, row] = rows;
    expect(header.length).toBe(widths.length);
    expect(row.length).toBe(header.length);

    const i = header.indexOf("Método: meu comentário");
    expect(header[i - 1]).toBe("Método: revisão");
    expect(row[i]).toBe("=amostra pequena");

    expect(header.slice(-5)).toEqual([
      "Pontos fortes",
      "Pontos fracos",
      "Relação com minha pesquisa",
      "Notas livres",
      "Minhas citações",
    ]);
    expect(row.slice(-5, -1)).toEqual(["claro", "", "cap. 2", ""]);
    // Spec 002: citações com página (impressa ou do PDF) e comentário.
    expect(row.at(-1)).toBe("“a amostra foi pequena” (p. 16) — limitação\n\n“sem grupo controle” (PDF p. 1)");
  });

  it("no CSV, comentário que começa com = é neutralizado", () => {
    const csv = buildCsv(tableRows(table, { critique: true }).rows);
    expect(csv).toContain("'=amostra pequena");
  });
});
