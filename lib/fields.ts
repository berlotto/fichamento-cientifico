/**
 * Campos da ficha: os 6 fixos, os opcionais que o projeto liga (spec 005) e os
 * personalizados de cada projeto.
 */

export const BUILTIN_FIELDS = [
  { key: "abstract", label: "Resumo" },
  { key: "subject", label: "Assunto" },
  { key: "objective", label: "Objetivo" },
  { key: "method", label: "Método" },
  { key: "results", label: "Resultados" },
  { key: "conclusions", label: "Conclusões" },
] as const;

/**
 * Campos fixos opcionais (spec 005): só o que os autores declaram, nunca
 * inferido. Ausentes na ficha = "não declarado pelos autores".
 */
export const OPTIONAL_FIELDS = [
  {
    key: "limitations",
    label: "Limitações declaradas",
    definition:
      "Limitações que os próprios autores reconhecem neste estudo (em geral na discussão ou numa seção de limitações).",
    prompt:
      "as limitações que os próprios autores reconhecem NESTE estudo, em 1 a 4 frases. Só o que está declarado no texto (seção de limitações ou discussão); nunca aponte limitações por conta própria nem traga limitações de outros estudos citados. Se os autores não declaram limitações, null.",
  },
  {
    key: "future_work",
    label: "Trabalhos futuros",
    definition: "O que os autores sugerem pesquisar depois, como declarado no artigo.",
    prompt:
      "o que os autores sugerem pesquisar ou fazer em estudos futuros, em 1 a 3 frases. Só o que está escrito; não sugira nada. Se não há sugestão, null.",
  },
  {
    key: "gaps",
    label: "Lacunas apontadas",
    definition: "Lacunas da literatura que os autores dizem que o estudo preenche ou que continuam abertas.",
    prompt:
      "as lacunas da literatura que os autores apontam (o que faltava saber e motivou o estudo, ou o que continua sem resposta), em 1 a 3 frases. Não confunda com limitações do próprio estudo. Só o que está escrito; se não há, null.",
  },
] as const;

export type OptionalFieldKey = (typeof OPTIONAL_FIELDS)[number]["key"];
export const OPTIONAL_KEYS: readonly string[] = OPTIONAL_FIELDS.map((f) => f.key);
/** Padrão de projeto novo: limitações e trabalhos futuros. */
export const DEFAULT_OPTIONAL: OptionalFieldKey[] = ["limitations", "future_work"];

/** Só chaves opcionais válidas, na ordem canônica. */
export const enabledOptional = (keys: readonly string[] | null | undefined): OptionalFieldKey[] =>
  OPTIONAL_FIELDS.filter((f) => keys?.includes(f.key)).map((f) => f.key);

export type FieldDef = { key: string; label: string; custom: boolean; optional?: boolean };

/** Fixos primeiro, depois os opcionais ligados, depois os personalizados na ordem do projeto. */
export function fieldDefs(custom: { key: string; label: string }[] = [], optional: readonly string[] = []): FieldDef[] {
  const builtin: FieldDef[] = BUILTIN_FIELDS.map((f) => ({ ...f, custom: false }));
  const extra: FieldDef[] = OPTIONAL_FIELDS.filter((f) => optional.includes(f.key)).map((f) => ({
    key: f.key,
    label: f.label,
    custom: false,
    optional: true,
  }));
  const taken = new Set<string>([...builtin, ...extra].map((f) => f.key));
  return [...builtin, ...extra, ...custom.filter((c) => !taken.has(c.key)).map((c) => ({ ...c, custom: true }))];
}

/** "Tamanho da amostra" → "tamanho_da_amostra" (chave estável para o banco e o LLM). */
export function fieldKey(label: string): string {
  const k = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z]/.test(k) ? k : `campo_${k}`.slice(0, 40);
}

export type FieldStatus = "pending" | "accepted" | "rejected";

/** O que cada campo fixo deve conter (vai para o juiz da verificação). */
export const BUILTIN_DEFINITIONS: Record<string, string> = {
  abstract: "Resumo do artigo (o do autor, quando existe).",
  subject: "Assunto/tema do estudo em uma frase, com a área.",
  objective: "Objetivo do estudo.",
  method: "Desenho do estudo, amostra/participantes, local e período, técnicas ou análises principais.",
  results: "Principais resultados deste estudo, com os números mais importantes.",
  conclusions: "Conclusões dos autores deste estudo.",
  ...Object.fromEntries(OPTIONAL_FIELDS.map((f) => [f.key, f.definition])),
};
