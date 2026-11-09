/** Campos da ficha: os 6 fixos e os personalizados de cada projeto. */

export const BUILTIN_FIELDS = [
  { key: "abstract", label: "Resumo" },
  { key: "subject", label: "Assunto" },
  { key: "objective", label: "Objetivo" },
  { key: "method", label: "Método" },
  { key: "results", label: "Resultados" },
  { key: "conclusions", label: "Conclusões" },
] as const;

export type FieldDef = { key: string; label: string; custom: boolean };

/** Fixos primeiro, depois os personalizados na ordem do projeto. */
export function fieldDefs(custom: { key: string; label: string }[] = []): FieldDef[] {
  const builtin = BUILTIN_FIELDS.map((f) => ({ ...f, custom: false }));
  const taken = new Set<string>(builtin.map((f) => f.key));
  return [...builtin, ...custom.filter((c) => !taken.has(c.key)).map((c) => ({ ...c, custom: true }))];
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
};
