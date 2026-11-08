import { describe, expect, it } from "vitest";
import { inferPrintedPages, marginNumbers } from "./printed-page";

describe("marginNumbers", () => {
  it("pega número no rodapé e ignora números do corpo", () => {
    const items = [
      { str: "Journal of Optics 12(3)", y: 800 },
      { str: "We enrolled", y: 600 },
      { str: "120", y: 590 },
      { str: "participants", y: 580 },
      { str: "more text", y: 400 },
      { str: "even more", y: 300 },
      { str: "and more", y: 200 },
      { str: "closing", y: 150 },
      { str: "footnote", y: 100 },
      { str: "215", y: 40 },
    ];
    expect(marginNumbers(items)).toEqual([215]);
  });

  it("página vazia", () => {
    expect(marginNumbers([])).toEqual([]);
  });
});

describe("inferPrintedPages", () => {
  it("acha o deslocamento do periódico e deixa a capa sem número", () => {
    const pages = [
      { pdf_page: 1, numbers: [] }, // capa do repositório
      { pdf_page: 2, numbers: [215, 12] },
      { pdf_page: 3, numbers: [216] },
      { pdf_page: 4, numbers: [217, 3] },
      { pdf_page: 5, numbers: [] }, // página com figura, sem rodapé lido
      { pdf_page: 6, numbers: [219] },
    ];
    const m = inferPrintedPages(pages);
    expect(m.get(1)).toBeNull();
    expect(m.get(2)).toBe("215");
    expect(m.get(5)).toBe("218");
    expect(m.get(6)).toBe("219");
  });

  it("sem consenso, tudo null", () => {
    const pages = [
      { pdf_page: 1, numbers: [7] },
      { pdf_page: 2, numbers: [40] },
      { pdf_page: 3, numbers: [99] },
    ];
    expect([...inferPrintedPages(pages).values()]).toEqual([null, null, null]);
  });
});
