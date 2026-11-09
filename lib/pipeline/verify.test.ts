import { describe, expect, it } from "vitest";
import { findQuoteRange, locateQuote, numbersInQuote, resolvePage } from "./verify";

const pages = [
  {
    pdf_page: 1,
    text: "Introduction. Previous work reported a preva-\nlence of glaucoma of 3.5% in adults over 40 years.",
  },
  {
    pdf_page: 2,
    text: "Results — the incidence was 12,4 per 1000 person-years among exposed workers. The cohort was followed",
  },
  {
    pdf_page: 3,
    text: "for a median of 8 years, with losses below 5%.",
  },
];

describe("locateQuote", () => {
  it("acha citação com hifenização de fim de linha", () => {
    expect(locateQuote("reported a prevalence of glaucoma of 3.5% in adults", pages)).toEqual([1]);
  });

  it("acha citação com travessão e vírgula decimal", () => {
    expect(locateQuote("Results - the incidence was 12,4 per 1000 person-years", pages)).toEqual([2]);
  });

  it("não acha citação inventada", () => {
    expect(locateQuote("the incidence was 15 per 1000 person-years among controls", pages)).toEqual([]);
  });

  it("recusa citação curta", () => {
    expect(locateQuote("incidence", pages)).toEqual([]);
  });

  it("acha citação que atravessa a quebra de página (A5)", () => {
    expect(locateQuote("The cohort was followed for a median of 8 years", pages)).toEqual([2]);
  });

  it("não junta páginas que não são vizinhas", () => {
    const gap = [pages[1], { ...pages[2], pdf_page: 5 }];
    expect(locateQuote("The cohort was followed for a median of 8 years", gap)).toEqual([]);
  });
});

describe("resolvePage", () => {
  it("mantém a página informada quando correta", () => {
    expect(resolvePage([2, 4], 4)).toBe(4);
  });
  it("corrige para a primeira página encontrada", () => {
    expect(resolvePage([2, 4], 7)).toBe(2);
  });
  it("devolve null quando não encontrada", () => {
    expect(resolvePage([], 3)).toBeNull();
  });
});

describe("numbersInQuote", () => {
  it("número presente", () => {
    expect(numbersInQuote("12.4 per 1000", "the incidence was 12,4 per 1000 person-years")).toBe(true);
  });

  it("número ausente", () => {
    expect(numbersInQuote(13.1, "the incidence was 12,4 per 1000 person-years")).toBe(false);
  });

  it("1.5 não casa com 15 (A6)", () => {
    expect(numbersInQuote(1.5, "a total of 15 patients")).toBe(false);
  });

  it("15 não casa com 150 (A6)", () => {
    expect(numbersInQuote(15, "a total of 150 patients")).toBe(false);
  });

  it("aceita separador de milhar", () => {
    expect(numbersInQuote(1234, "we enrolled 1,234 participants")).toBe(true);
  });

  it("aceita ponto médio como decimal", () => {
    expect(numbersInQuote("12.5", "OR 12·5 (95% CI 10·1–14·9)")).toBe(true);
  });

  it("valor sem números passa", () => {
    expect(numbersInQuote("coorte prospectiva", "a prospective cohort study")).toBe(true);
  });
});

describe("findQuoteRange", () => {
  const text = "Resultados. A incidên-\ncia foi 12,5% maior\nno grupo exposto ao ozônio durante o estudo.";
  it("acha o trecho apesar de quebra de linha e pontuação", () => {
    // Limitação conhecida: palavra hifenizada na quebra de linha não casa (só não destaca).
    expect(findQuoteRange(text, "A incidência foi 12,5% maior no grupo exposto")).toBeNull();
    const r2 = findQuoteRange(text, "foi 12,5% maior no grupo exposto ao ozônio")!;
    expect(text.slice(r2[0], r2[1])).toBe("foi 12,5% maior\nno grupo exposto ao ozônio");
  });
  it("trecho que continua na página seguinte: destaca o começo", () => {
    const r = findQuoteRange(text, "no grupo exposto ao ozônio durante o estudo e seguiu na outra página com mais palavras")!;
    expect(text.slice(r[0], r[1])).toBe("no grupo exposto ao ozônio durante");
  });
  it("trecho curto ou ausente: null", () => {
    expect(findQuoteRange(text, "ozônio")).toBeNull();
    expect(findQuoteRange(text, "nada disso aparece aqui")).toBeNull();
  });
});
