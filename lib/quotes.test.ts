import { describe, expect, it } from "vitest";
import { checkQuote, normalizeSelection } from "./quotes";

const page = `Resultados
A incidência de glau-
coma foi maior nos municípios
com menor coluna de ozônio (RR 1,32).
COVID-
19 e pós-
Graduação`;

describe("normalizeSelection", () => {
  it("junta a hifenização de fim de linha e as quebras", () => {
    expect(normalizeSelection("A incidência de glau-\ncoma foi maior nos municípios\ncom menor")).toBe(
      "A incidência de glaucoma foi maior nos municípios com menor",
    );
  });
  it("mantém hífen antes de maiúscula ou número", () => {
    expect(normalizeSelection("COVID-\n19 e pós-\nGraduação")).toBe("COVID- 19 e pós- Graduação");
  });
});

describe("checkQuote", () => {
  it("aceita trecho que atravessa quebra de linha", () => {
    const r = checkQuote("incidência de glau-\ncoma foi maior nos municípios\ncom menor coluna", page);
    expect(r).toEqual({ ok: true, text: "incidência de glaucoma foi maior nos municípios com menor coluna" });
  });
  it("recusa trecho que não está na página", () => {
    expect(checkQuote("Guardar citação incidência de glaucoma", page).ok).toBe(false);
  });
  it("recusa menos de três palavras e trecho longo demais", () => {
    expect(checkQuote("glaucoma foi", page).ok).toBe(false);
    expect(checkQuote("a ".repeat(1001), "a ".repeat(2000)).ok).toBe(false);
  });
});
