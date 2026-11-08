import { describe, expect, it, vi } from "vitest";
import { crossrefByDoi, crossrefByTitle, findDoi, mapCrossref, mergeMetadata, normalizeDoi, sameTitle, type BiblioMetadata } from "./metadata";

const empty: BiblioMetadata = {
  title: null, subtitle: null, authors: [], year: null, venue: null,
  volume: null, issue: null, pages: null, doi: null, language: null,
};

describe("findDoi", () => {
  it("acha o DOI nas primeiras páginas e limpa a pontuação final", () => {
    const pages = [
      { pdf_page: 1, text: "Rev. Bras. Oftalmol. 2021\nhttps://doi.org/10.1590/0034-7280.2021.0012." },
      { pdf_page: 9, text: "Referências\n1. Outro. doi:10.1000/xyz123" },
    ];
    expect(findDoi(pages)).toBe("10.1590/0034-7280.2021.0012");
  });
  it("ignora DOIs que só aparecem nas referências do fim", () => {
    expect(findDoi([{ pdf_page: 1, text: "sem doi" }, { pdf_page: 2, text: "nada" }, { pdf_page: 3, text: "10.1000/abc" }])).toBeNull();
  });
  it("normalizeDoi", () => {
    expect(normalizeDoi("https://dx.doi.org/10.1016/J.OPHTHA.2020.01.002),")).toBe("10.1016/j.ophtha.2020.01.002");
    expect(normalizeDoi("doi: 10.1/x")).toBe("10.1/x");
  });
});

const work = {
  DOI: "10.1590/ABC",
  title: ["Ozônio e <i>glaucoma</i>"],
  subtitle: ["um estudo de coorte"],
  author: [{ given: "Maria", family: "Silva" }, { name: "Grupo de Estudos" }, { given: "Sem sobrenome" }],
  issued: { "date-parts": [[2021, 3]] },
  "published-online": { "date-parts": [[2020, 12]] },
  "container-title": ["Revista Brasileira de Oftalmologia"],
  volume: "80",
  issue: "2",
  page: "123-145",
};

describe("mapCrossref", () => {
  it("mapeia campos, tira marcação JATS e ignora autor sem sobrenome", () => {
    expect(mapCrossref(work)).toEqual({
      title: "Ozônio e glaucoma",
      subtitle: "um estudo de coorte",
      authors: [{ family: "Silva", given: "Maria" }, { family: "Grupo de Estudos" }],
      year: 2021,
      venue: "Revista Brasileira de Oftalmologia",
      volume: "80",
      issue: "2",
      pages: "123-145",
      doi: "10.1590/abc",
      language: null,
    });
  });
});

describe("número do artigo no lugar das páginas", () => {
  it("usa article-number quando não há page", () => {
    expect(mapCrossref({ ...work, page: undefined, "article-number": "1112296" }).pages).toBe("1112296");
  });
});

describe("Crossref (fetch simulado)", () => {
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  it("por DOI; 404 vira null", async () => {
    const f = vi.fn().mockReturnValueOnce(ok({ message: work })).mockResolvedValueOnce(new Response("", { status: 404 }));
    expect((await crossrefByDoi("10.1590/abc", f))?.title).toBe("Ozônio e glaucoma");
    expect(await crossrefByDoi("10.1/nada", f)).toBeNull();
    expect(f.mock.calls[0][0]).toBe("https://api.crossref.org/works/10.1590%2Fabc");
  });

  it("por título: só aceita quando título, primeiro autor e ano batem", async () => {
    const other = { ...work, title: ["Outro artigo qualquer sobre glaucoma"], subtitle: [] };
    const reprint = { ...work, DOI: "10.9/dup", issued: { "date-parts": [[2025]] }, "published-print": undefined };
    const otherAuthor = { ...work, DOI: "10.9/x", author: [{ family: "Pereira" }] };
    const f = vi.fn(() => ok({ message: { items: [other, reprint, otherAuthor, work] } }));
    expect((await crossrefByTitle("Ozônio e glaucoma: um estudo de coorte", "Silva", 2021, f))?.doi).toBe("10.1590/abc");
    const g = vi.fn(() => ok({ message: { items: [other, reprint] } }));
    expect(await crossrefByTitle("Ozônio e glaucoma", "Silva", 2021, g)).toBeNull();
  });
});

describe("sameTitle e mergeMetadata", () => {
  it("sameTitle ignora caixa e pontuação, exige tamanho mínimo", () => {
    expect(sameTitle("Ozone and Glaucoma: a cohort", "ozone and glaucoma — a cohort")).toBe(true);
    expect(sameTitle("Short", "Short")).toBe(false);
  });
  it("Crossref manda, LLM completa; língua vem do LLM", () => {
    const cr = { ...empty, title: "Do Crossref", year: 2021, authors: [{ family: "Silva" }] };
    const llm = { ...empty, title: "Do LLM", subtitle: "sub do LLM", year: 2020, language: "pt", authors: [{ family: "X" }] };
    expect(mergeMetadata(cr, llm)).toMatchObject({
      title: "Do Crossref", subtitle: "sub do LLM", year: 2021, language: "pt", authors: [{ family: "Silva" }],
    });
    expect(mergeMetadata(null, llm)).toEqual(llm);
  });
  it("tira do título o subtítulo repetido", () => {
    const cr = { ...empty, title: "The role of ozone treatment. An evidence and gap map" };
    const llm = { ...empty, subtitle: "An evidence and gap map" };
    expect(mergeMetadata(cr, llm)).toMatchObject({ title: "The role of ozone treatment", subtitle: "An evidence and gap map" });
  });
});
