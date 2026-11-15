import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { customFieldsPrompt, extractionSchema, optionalFieldsPrompt } = await import("./extract");
const { enabledOptional, fieldDefs } = await import("@/lib/fields");

describe("campos opcionais (spec 005)", () => {
  it("só chaves válidas, na ordem canônica", () => {
    expect(enabledOptional(["gaps", "lixo", "limitations"])).toEqual(["limitations", "gaps"]);
    expect(enabledOptional(null)).toEqual([]);
  });

  it("fieldDefs: fixos, opcionais ligados, depois personalizados (sem repetir chave)", () => {
    const defs = fieldDefs(
      [
        { key: "limitations", label: "Minhas limitações" },
        { key: "amostra", label: "Amostra" },
      ],
      ["limitations", "future_work"],
    );
    expect(defs.map((d) => d.key)).toEqual([
      "abstract",
      "subject",
      "objective",
      "method",
      "results",
      "conclusions",
      "limitations",
      "future_work",
      "amostra",
    ]);
    expect(defs.find((d) => d.key === "limitations")).toMatchObject({ label: "Limitações declaradas", optional: true });
  });

  it("o schema pede só os opcionais ligados", () => {
    const keys = Object.keys(extractionSchema([], ["limitations"]).shape.fields.shape);
    expect(keys).toContain("limitations");
    expect(keys).not.toContain("gaps");
    expect(Object.keys(extractionSchema().shape.fields.shape)).not.toContain("limitations");
  });

  it("o prompt manda registrar só o que os autores declaram, e null na falta", () => {
    const p = optionalFieldsPrompt(["limitations", "future_work"]);
    expect(p).toContain("DECLARAM");
    expect(p).toContain("- limitations:");
    expect(p).toContain("nunca aponte limitações por conta própria");
    expect(p).not.toContain("- gaps:");
    expect(optionalFieldsPrompt([])).toBe("");
  });

  it("campo personalizado com chave de opcional ligado não entra duas vezes no prompt", () => {
    const p = customFieldsPrompt([{ key: "limitations", label: "X", instructions: null }], ["limitations"]);
    expect(p).toBe("");
  });
});
