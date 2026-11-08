import { describe, expect, it } from "vitest";
import type { Extraction } from "@/lib/llm/extract";
import { buildFieldRows, llmMetadata, statusAfterExtract } from "./extract";

const pages = [
  { pdf_page: 1, printed_page: "123", text: "Resumo: Avaliamos a associação entre ozônio e glaucoma em adultos do Sul do Brasil." },
  {
    pdf_page: 2,
    printed_page: "124",
    text: "Métodos. Estudo de coorte com 1.250 participantes acompanhados por 5 anos em Porto Alegre.",
  },
  { pdf_page: 3, printed_page: "125", text: "Resultados. A incidência foi 12,5% maior no grupo exposto ao ozônio." },
];

const none = { value: null, quote: null, pdf_page: null };

function extraction(fields: Partial<Extraction["fields"]>, fromAuthor = false): Extraction {
  return {
    metadata: {
      title: " Ozônio e glaucoma ", subtitle: "", authors: [{ family: "Silva", given: null }, { family: " ", given: "x" }],
      year: 2021, venue: null, volume: null, issue: null, pages: null, doi: "https://doi.org/10.1590/ABC.", language: "PT-BR",
    },
    abstract_from_author: fromAuthor,
    fields: { abstract: none, subject: none, objective: none, method: none, results: none, conclusions: none, ...fields },
  };
}

describe("buildFieldRows", () => {
  it("trecho encontrado e números presentes: verificado, com página impressa", () => {
    const [row] = buildFieldRows(
      extraction({
        method: {
          value: "Coorte com 1.250 participantes por 5 anos.",
          quote: "Estudo de coorte com 1.250 participantes acompanhados por 5 anos",
          pdf_page: 1, // página errada informada pelo LLM: corrigida para onde o trecho está
        },
      }),
      pages,
    );
    expect(row).toMatchObject({ key: "method", verified: true, pdf_page: 2, printed_page: "124", source: "llm" });
  });

  it("número do valor ausente no trecho: não verificado", () => {
    const [row] = buildFieldRows(
      extraction({
        results: { value: "Incidência 12,5% maior em 3 cidades.", quote: "A incidência foi 12,5% maior no grupo exposto ao ozônio", pdf_page: 3 },
      }),
      pages,
    );
    expect(row.verified).toBe(false);
    expect(row.pdf_page).toBe(3);
  });

  it("trecho inventado: não verificado e sem página impressa", () => {
    const [row] = buildFieldRows(
      extraction({ objective: { value: "Avaliar X.", quote: "Este trecho não existe em nenhuma página do artigo", pdf_page: 2 } }),
      pages,
    );
    expect(row).toMatchObject({ verified: false, pdf_page: 2, printed_page: null });
  });

  it("resumo do autor: basta o trecho existir; sem quote usa o início do valor", () => {
    const [row] = buildFieldRows(
      extraction(
        { abstract: { value: "Avaliamos a associação entre ozônio e glaucoma em adultos do Sul do Brasil. 2021.", quote: null, pdf_page: 1 } },
        true,
      ),
      pages,
    );
    expect(row).toMatchObject({ key: "abstract", source: "author", pdf_page: 1, printed_page: null, verified: false });
    const [ok] = buildFieldRows(
      extraction(
        { abstract: { value: "Avaliamos a associação entre ozônio e glaucoma. Com 40 números que não estão.", quote: "Avaliamos a associação entre ozônio e glaucoma em adultos", pdf_page: 1 } },
        true,
      ),
      pages,
    );
    expect(ok).toMatchObject({ source: "author", verified: true, printed_page: "123" });
  });

  it("campos vazios são ignorados e status reflete a verificação", () => {
    expect(buildFieldRows(extraction({ subject: { value: "  ", quote: null, pdf_page: null } }), pages)).toEqual([]);
    expect(statusAfterExtract([])).toBe("needs_review");
  });
});

describe("llmMetadata", () => {
  it("limpa espaços, autores vazios, DOI e língua", () => {
    expect(llmMetadata(extraction({}))).toMatchObject({
      title: "Ozônio e glaucoma",
      subtitle: null,
      authors: [{ family: "Silva" }],
      doi: "10.1590/abc",
      language: "pt",
    });
  });
});
