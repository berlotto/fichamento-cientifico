import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { resolveModels } = await import("./models");

describe("resolveModels", () => {
  it("configuração do admin vale mais que a variável de ambiente", () => {
    const m = resolveModels(
      { extract_model: "openai/gpt-5-mini", cross_model: null, judge_model: "anthropic/claude-haiku-5.5" },
      { EXTRACT_MODEL: "google/gemini-3.5-flash", CROSS_MODEL: "google/gemini-3.5-flash" },
    );
    expect(m.extract).toEqual({ model: "openai/gpt-5-mini", source: "settings" });
    expect(m.cross).toEqual({ model: "google/gemini-3.5-flash", source: "env" });
    expect(m.judge).toEqual({ model: "anthropic/claude-haiku-5.5", source: "settings" });
  });

  it("sem configuração nem ambiente: extrator padrão, segundo e juiz automáticos", () => {
    const m = resolveModels(null, {});
    expect(m.extract.source).toBe("default");
    expect(m.cross).toBeNull();
    expect(m.judge).toBeNull();
  });
});
