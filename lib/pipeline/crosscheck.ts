/**
 * Verificação automática (F2), parte pura: junta o segundo extrator e o juiz e
 * decide o que pode ser aprovado sem revisão humana e o que vai para auditoria.
 *
 * Um campo só é aprovado sozinho se TUDO isto vale:
 * - o projeto ligou a aprovação automática;
 * - o campo não é crítico e não perdeu a aprovação por erro na auditoria;
 * - o trecho foi encontrado no PDF e os números do valor estão nele (verify.ts);
 * - o segundo extrator diz a mesma coisa;
 * - o juiz diz que o trecho sustenta o valor e que é deste estudo.
 * Das aprovações automáticas, uma fração (audit_rate) vai para auditoria às cegas.
 */
import type { JudgeVerdict } from "@/lib/llm/judge";

export type PendingField = {
  key: string;
  value: string;
  quote: string | null;
  verified: boolean;
  source: string;
};

export type CrossSettings = {
  autoApprove: boolean;
  critical: Set<string>;
  auditRate: number;
  /** Campos que perderam a aprovação automática (erro alto na auditoria). */
  blocked: Set<string>;
};

export type CrossUpdate = {
  key: string;
  value_b: string | null;
  agrees: boolean | null;
  supported: boolean | null;
  from_study: boolean | null;
  judge_note: string | null;
  auto_approved: boolean;
  audit_pending: boolean;
};

export function decide(
  fields: PendingField[],
  valuesB: Map<string, string | null>,
  verdicts: Map<string, JudgeVerdict>,
  settings: CrossSettings,
  random: () => number = Math.random,
): CrossUpdate[] {
  return fields.map((f) => {
    const v = verdicts.get(f.key);
    const valueB = valuesB.get(f.key) ?? null;
    // Sem valor do segundo extrator não há concordância a afirmar.
    const agrees = valueB == null ? null : (v?.agrees ?? null);
    // Resumo do autor é tradução de texto do artigo, não interpretação: duas traduções
    // nunca saem iguais; basta o juiz confirmar que é fiel ao original.
    const needsAgreement = f.source !== "author";
    const ok =
      settings.autoApprove &&
      !settings.critical.has(f.key) &&
      !settings.blocked.has(f.key) &&
      f.verified &&
      (!needsAgreement || agrees === true) &&
      v?.supported === true &&
      v?.from_study === true;
    return {
      key: f.key,
      value_b: valueB,
      agrees,
      supported: v?.supported ?? null,
      from_study: v?.from_study ?? null,
      judge_note: v?.note?.trim() || null,
      auto_approved: ok,
      audit_pending: ok && random() < settings.auditRate,
    };
  });
}

export type AuditRecord = { key: string; result: "correct" | "incorrect" };

export const MIN_AUDITS = 5;
export const MAX_ERROR_RATE = 0.1;

/** Campos com erro acima do limite na auditoria (com amostra mínima) perdem a aprovação automática. */
export function blockedKeys(audits: AuditRecord[]): Set<string> {
  const byKey = new Map<string, { n: number; wrong: number }>();
  for (const a of audits) {
    const s = byKey.get(a.key) ?? { n: 0, wrong: 0 };
    s.n++;
    if (a.result === "incorrect") s.wrong++;
    byKey.set(a.key, s);
  }
  const out = new Set<string>();
  for (const [key, s] of byKey) if (s.n >= MIN_AUDITS && s.wrong / s.n > MAX_ERROR_RATE) out.add(key);
  return out;
}

const provider = (model: string) => model.split("/")[0];

/**
 * Modelo de outro fornecedor para o segundo extrator/juiz. Se o configurado é
 * do mesmo fornecedor do extrator principal, usa o primeiro alternativo que não seja.
 */
export function differentProvider(primary: string, preferred: string, fallbacks: string[]): string {
  if (provider(preferred) !== provider(primary)) return preferred;
  return fallbacks.find((m) => provider(m) !== provider(primary)) ?? preferred;
}
