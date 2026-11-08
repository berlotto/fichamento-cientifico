import { describe, expect, it } from "vitest";
import {
  abntParts,
  abntReference,
  allReferences,
  apaParts,
  authorLine,
  bibtex,
  fullTitle,
  initialsOf,
  parseAuthors,
  refText,
  shortCite,
  vancouverPages,
  vancouverParts,
} from "./citation";

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

const full = {
  authors: [
    { family: "Silva", given: "Maria Clara" },
    { family: "Souza", given: "João" },
  ],
  title: "Ozônio e glaucoma",
  subtitle: "um estudo de coorte",
  venue: "Revista Brasileira de Oftalmologia",
  year: 2021,
  volume: "80",
  issue: "2",
  pages: "123–145",
  doi: "https://doi.org/10.1234/rbo.2021.002",
};

describe("referências completas", () => {
  it("ABNT com subtítulo, volume, número, páginas e DOI; periódico em negrito", () => {
    const parts = abntParts(full)!;
    expect(refText(parts)).toBe(
      "SILVA, M. C.; SOUZA, J. Ozônio e glaucoma: um estudo de coorte. Revista Brasileira de Oftalmologia, v. 80, n. 2, p. 123-145, 2021. DOI: https://doi.org/10.1234/rbo.2021.002.",
    );
    expect(parts).toContainEqual({ b: "Revista Brasileira de Oftalmologia" });
  });

  it("APA 7: & antes do último autor, periódico e volume em itálico, en dash", () => {
    const parts = apaParts(full)!;
    expect(refText(parts)).toBe(
      "Silva, M. C., & Souza, J. (2021). Ozônio e glaucoma: um estudo de coorte. Revista Brasileira de Oftalmologia, 80(2), 123–145. https://doi.org/10.1234/rbo.2021.002",
    );
    expect(parts).toContainEqual({ i: "80" });
  });

  it("APA com 21 autores: 19, reticências e o último", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ family: `A${i + 1}`, given: "B" }));
    const text = refText(apaParts({ ...full, authors: many })!);
    expect(text).toContain("A19, B., . . . A21, B. (2021)");
    expect(text).not.toContain("A20,");
  });

  it("Vancouver: iniciais sem ponto, página final abreviada, et al depois de seis", () => {
    expect(refText(vancouverParts(full)!)).toBe(
      "Silva MC, Souza J. Ozônio e glaucoma: um estudo de coorte. Revista Brasileira de Oftalmologia. 2021;80(2):123-45. doi:10.1234/rbo.2021.002",
    );
    const seven = Array.from({ length: 7 }, (_, i) => ({ family: `S${i}`, given: "Ana" }));
    expect(refText(vancouverParts({ ...full, authors: seven })!)).toMatch(/^S0 A, S1 A, S2 A, S3 A, S4 A, S5 A, et al\. /);
  });

  it("número do artigo no lugar de páginas", () => {
    const art = { ...full, pages: "1112296" };
    expect(refText(abntParts(art)!)).toContain("v. 80, n. 2, 1112296, 2021.");
    expect(refText(apaParts(art)!)).toContain("80(2), Article 1112296.");
    expect(refText(vancouverParts(art)!)).toContain("2021;80(2):1112296.");
  });

  it("vancouverPages", () => {
    expect(vancouverPages("123-145")).toBe("123-45");
    expect(vancouverPages("1234-1240")).toBe("1234-40");
    expect(vancouverPages("99-102")).toBe("99-102");
    expect(vancouverPages("e123")).toBe("e123");
  });

  it("BibTeX com chave derivada e caracteres escapados", () => {
    expect(bibtex({ ...full, title: "Custo & benefício do tratamento" })).toBe(
      [
        "@article{silva2021custo,",
        "  author = {Silva, Maria Clara and Souza, João},",
        "  title = {Custo \\& benefício do tratamento: um estudo de coorte},",
        "  journal = {Revista Brasileira de Oftalmologia},",
        "  year = {2021},",
        "  volume = {80},",
        "  number = {2},",
        "  pages = {123--145},",
        "  doi = {10.1234/rbo.2021.002}",
        "}",
      ].join("\n"),
    );
  });

  it("subtítulo já contido no título não se repete", () => {
    expect(fullTitle({ title: "Ozônio e glaucoma: um estudo de coorte", subtitle: "um estudo de coorte" })).toBe(
      "Ozônio e glaucoma: um estudo de coorte",
    );
  });

  it("allReferences é null sem ano", () => {
    expect(allReferences({ ...full, year: null })).toBeNull();
    expect(Object.keys(allReferences(full)!)).toEqual(["abnt", "apa", "vancouver", "bibtex"]);
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
