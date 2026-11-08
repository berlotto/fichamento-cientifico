import { describe, expect, it } from "vitest";
import { abntReference, authorLine, initialsOf, parseAuthors, shortCite } from "./citation";

const three = [
  { family: "Moraes", given: "Ana" },
  { family: "Tavares", given: "Luiz" },
  { family: "Ribeiro", given: "Carla" },
];

describe("shortCite", () => {
  it("um, dois e três ou mais autores", () => {
    expect(shortCite({ authors: [{ family: "Carvalho" }], year: 2018 })).toBe("Carvalho, 2018");
    expect(shortCite({ authors: three.slice(1), year: 2020 })).toBe("Tavares; Ribeiro, 2020");
    expect(shortCite({ authors: three, year: 2022 })).toBe("Moraes et al., 2022");
  });
  it("maiúsculas para a citação entre parênteses", () => {
    expect(shortCite({ authors: three, year: 2022 }, true)).toBe("MORAES et al., 2022");
  });
  it("null sem autor ou sem ano", () => {
    expect(shortCite({ authors: [], year: 2022 })).toBeNull();
    expect(shortCite({ authors: three, year: null })).toBeNull();
  });
});

describe("abntReference", () => {
  it("até três autores por extenso", () => {
    expect(
      abntReference({
        authors: three,
        title: "Coluna de ozônio e glaucoma",
        venue: "Revista Exemplo de Oftalmologia",
        year: 2022,
      }),
    ).toBe("MORAES, A.; TAVARES, L.; RIBEIRO, C. Coluna de ozônio e glaucoma. Revista Exemplo de Oftalmologia, 2022.");
  });
  it("quatro ou mais autores: et al.", () => {
    const four = [...three, { family: "Souza", given: "João Pedro" }];
    expect(abntReference({ authors: four, title: "T.", year: 2021 })).toBe("MORAES, A. et al. T. 2021.");
  });
  it("prenome composto vira iniciais", () => {
    expect(abntReference({ authors: [{ family: "Souza", given: "João Pedro" }], title: "T", year: 2021 })).toBe(
      "SOUZA, J. P. T. 2021.",
    );
  });
  it("null sem título", () => {
    expect(abntReference({ authors: three, year: 2022 })).toBeNull();
  });
});

describe("auxiliares", () => {
  it("authorLine", () => {
    expect(authorLine({ authors: three })).toBe("Moraes, Tavares e Ribeiro");
  });
  it("parseAuthors ignora lixo", () => {
    expect(parseAuthors([{ family: "" }, null, "x", { family: "Lima" }])).toEqual([{ family: "Lima", given: undefined }]);
    expect(parseAuthors(null)).toEqual([]);
  });
  it("initialsOf", () => {
    expect(initialsOf("Sérgio Berlotto Jr.")).toBe("SJ");
    expect(initialsOf("Ana")).toBe("AN");
    expect(initialsOf(null, "sergio@x.com")).toBe("SE");
  });
});
