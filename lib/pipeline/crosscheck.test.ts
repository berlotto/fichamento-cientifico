import { describe, expect, it } from "vitest";
import type { JudgeVerdict } from "@/lib/llm/judge";
import { blockedKeys, decide, differentProvider, type CrossSettings, type PendingField } from "./crosscheck";

const field = (key: string, verified = true): PendingField => ({ key, value: `v ${key}`, quote: "q", verified, source: "llm" });
const verdict = (key: string, o: Partial<JudgeVerdict> = {}): JudgeVerdict => ({
  key,
  agrees: true,
  supported: true,
  from_study: true,
  note: null,
  ...o,
});
const settings = (o: Partial<CrossSettings> = {}): CrossSettings => ({
  autoApprove: true,
  critical: new Set(["results"]),
  auditRate: 0,
  blocked: new Set(),
  ...o,
});

describe("decide", () => {
  const B = new Map<string, string | null>([
    ["objective", "outro"],
    ["results", "outro"],
    ["method", "outro"],
  ]);

  it("aprova só quando tudo passa e o campo não é crítico", () => {
    const [obj, res] = decide([field("objective"), field("results")], B, new Map([["objective", verdict("objective")], ["results", verdict("results")]]), settings());
    expect(obj).toMatchObject({ auto_approved: true, agrees: true, supported: true, from_study: true });
    expect(res.auto_approved).toBe(false); // crítico
  });

  it("qualquer verificação falhando impede a aprovação", () => {
    const cases: [PendingField, JudgeVerdict | undefined][] = [
      [field("method", false), verdict("method")], // trecho não conferido no PDF
      [field("method"), verdict("method", { agrees: false })],
      [field("method"), verdict("method", { supported: false })],
      [field("method"), verdict("method", { from_study: false, note: "trecho da introdução" })],
      [field("method"), undefined], // juiz não respondeu
    ];
    for (const [f, v] of cases) {
      const [u] = decide([f], B, new Map(v ? [[v.key, v]] : []), settings());
      expect(u.auto_approved).toBe(false);
    }
  });

  it("sem segundo valor, concordância é null e não aprova", () => {
    const [u] = decide([field("objective")], new Map([["objective", null]]), new Map([["objective", verdict("objective")]]), settings());
    expect(u).toMatchObject({ agrees: null, auto_approved: false });
  });

  it("projeto sem aprovação automática ou campo bloqueado: só grava os veredictos", () => {
    const vs = new Map([["objective", verdict("objective")]]);
    expect(decide([field("objective")], B, vs, settings({ autoApprove: false }))[0].auto_approved).toBe(false);
    expect(decide([field("objective")], B, vs, settings({ blocked: new Set(["objective"]) }))[0].auto_approved).toBe(false);
  });

  it("amostra para auditoria só entre as aprovadas", () => {
    const vs = new Map([["objective", verdict("objective")]]);
    expect(decide([field("objective")], B, vs, settings({ auditRate: 0.1 }), () => 0.05)[0].audit_pending).toBe(true);
    expect(decide([field("objective")], B, vs, settings({ auditRate: 0.1 }), () => 0.5)[0].audit_pending).toBe(false);
    expect(decide([field("objective", false)], B, vs, settings({ auditRate: 1 }), () => 0)[0].audit_pending).toBe(false);
  });
});

describe("resumo do autor", () => {
  it("não exige concordância do segundo modelo (traduções diferem), só fidelidade ao original", () => {
    const abs: PendingField = { key: "abstract", value: "tradução", quote: "original", verified: true, source: "author" };
    const [u] = decide([abs], new Map([["abstract", "outra tradução"]]), new Map([["abstract", verdict("abstract", { agrees: false })]]), settings());
    expect(u.auto_approved).toBe(true);
    const [bad] = decide([abs], new Map([["abstract", "x"]]), new Map([["abstract", verdict("abstract", { supported: false })]]), settings());
    expect(bad.auto_approved).toBe(false);
  });
});

describe("blockedKeys", () => {
  it("bloqueia com 5+ auditorias e erro acima de 10%", () => {
    const audits = [
      ...Array.from({ length: 5 }, () => ({ key: "method", result: "correct" as const })),
      { key: "method", result: "incorrect" as const }, // 1/6 = 17%
      ...Array.from({ length: 9 }, () => ({ key: "objective", result: "correct" as const })),
      { key: "objective", result: "incorrect" as const }, // 1/10 = 10%: no limite, não bloqueia
      ...Array.from({ length: 3 }, () => ({ key: "subject", result: "incorrect" as const })), // amostra pequena
    ];
    expect([...blockedKeys(audits)]).toEqual(["method"]);
  });
});

describe("differentProvider", () => {
  it("troca quando o segundo modelo é do mesmo fornecedor", () => {
    expect(differentProvider("openai/gpt-5-mini", "google/gemini-3.5-flash", [])).toBe("google/gemini-3.5-flash");
    expect(differentProvider("google/gemini-3-flash", "google/gemini-3.5-flash", ["openai/gpt-5-mini"])).toBe(
      "openai/gpt-5-mini",
    );
  });
});
