/** Padrões de verificação para projetos novos (guardados no user_metadata). */
export type ProjectDefaults = {
  crossCheck: boolean;
  autoApprove: boolean;
  critical: string[];
  auditRate: number;
};

export const AUDIT_RATES = [0.05, 0.1, 0.2, 0.5] as const;

/** Lê os padrões do user_metadata; valores inválidos voltam ao padrão. */
export function projectDefaultsFrom(meta: Record<string, unknown>): ProjectDefaults {
  const critical = Array.isArray(meta.default_critical_fields)
    ? meta.default_critical_fields.filter((k): k is string => typeof k === "string" && /^[a-z][a-z0-9_]{1,39}$/.test(k))
    : ["results"];
  const rate = Number(meta.default_audit_rate);
  const crossCheck = meta.default_cross_check !== false;
  return {
    crossCheck,
    autoApprove: crossCheck && meta.default_auto_approve === true,
    critical: [...new Set(critical)].slice(0, 40),
    auditRate: (AUDIT_RATES as readonly number[]).includes(rate) ? rate : 0.1,
  };
}

export const CITATION_STYLES = ["abnt", "apa", "vancouver", "bibtex"] as const;
export type CitationStyleChoice = (typeof CITATION_STYLES)[number];

export function validCitationStyle(v: unknown): CitationStyleChoice {
  return (CITATION_STYLES as readonly unknown[]).includes(v) ? (v as CitationStyleChoice) : "abnt";
}
