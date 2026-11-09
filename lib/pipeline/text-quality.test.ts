import { describe, expect, it } from "vitest";
import { readability, repairPageText, unshift29 } from "./text-quality";

const prose =
  "Social relationships have profound effects on health in humans and other primates. We studied how the " +
  "immune system responds to changes in social status among female rhesus macaques housed in captivity, " +
  "and found that status predicts gene expression across many immune pathways in the blood samples collected.";

// Mesmo texto como sai de PDF com fonte deslocada (cada caractere 29 posições abaixo).
const shifted = prose.replace(/[>-}]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 29));

describe("texto ilegível (fonte deslocada)", () => {
  it("prosa normal é legível; deslocada não", () => {
    expect(readability(prose)).toBeGreaterThan(0.8);
    expect(readability(shifted)).toBeLessThan(0.3);
  });

  it("unshift29 recupera o texto (exemplo real do eLife)", () => {
    expect(unshift29("3DJHRI")).toBe("Pageof");
    expect(unshift29("$EVWUDFW")).toBe("Abstract");
  });

  it("repairPageText conserta a página deslocada e não mexe na normal", () => {
    expect(repairPageText(prose)).toEqual({ text: prose, garbled: false });
    const r = repairPageText(shifted);
    expect(r.garbled).toBe(false);
    expect(r.text).toContain("Socialrelationships".slice(0, 6));
    expect(r.text.replace(/\s/g, "")).toContain("immunesystem");
  });

  it("lixo sem conserto vai para OCR", () => {
    // Letras fora da faixa do deslocamento (outra codificação quebrada): não há conserto.
    const junk = Array.from({ length: 40 }, () => "ΞΨΩ ЖШЩ ŁĦŊ").join(" ");
    expect(repairPageText(junk).garbled).toBe(true);
  });
});
