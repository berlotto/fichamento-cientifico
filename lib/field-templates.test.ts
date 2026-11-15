import { describe, expect, it } from "vitest";
import { FIELD_TEMPLATES, planTemplate, templateById } from "./field-templates";
import { BUILTIN_FIELDS, OPTIONAL_KEYS } from "./fields";

describe("modelos de campos (spec 007)", () => {
  it("PICO tem população, intervenção, comparação e desfecho; PICOS acrescenta o desenho", () => {
    expect(templateById("pico")!.fields.map((f) => f.key)).toEqual(["population", "intervention", "comparison", "outcome"]);
    expect(templateById("picos")!.fields.map((f) => f.key)).toEqual([
      "population",
      "intervention",
      "comparison",
      "outcome",
      "study_design",
    ]);
  });

  it("todo campo tem chave válida, nome e instrução, sem colidir com os fixos e opcionais", () => {
    const reserved = new Set<string>([...BUILTIN_FIELDS.map((f) => f.key), ...OPTIONAL_KEYS]);
    for (const t of FIELD_TEMPLATES) {
      for (const f of t.fields) {
        expect(f.key).toMatch(/^[a-z][a-z0-9_]{1,39}$/);
        expect(f.label.length).toBeGreaterThan(0);
        expect(f.instructions.length).toBeGreaterThan(10);
        expect(reserved.has(f.key)).toBe(false);
      }
    }
  });

  it("aplicar não repete campos que o projeto já tem", () => {
    const plan = planTemplate(templateById("peo")!, ["population", "amostra"], 20);
    expect(plan.add.map((f) => f.key)).toEqual(["exposure", "outcome", "confounders"]);
    expect(plan.skipped).toBe(1);
    expect(plan.fits).toBe(true);
  });

  it("avisa quando o modelo não cabe no limite", () => {
    const plan = planTemplate(templateById("spider")!, ["a1", "a2", "a3"], 5);
    expect(plan.fits).toBe(false);
    expect(plan.room).toBe(2);
  });
});
