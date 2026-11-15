/**
 * Situação de leitura, relevância e estrela (spec 004): do pesquisador, sem
 * relação com o status do pipeline.
 */

export const READING_STATUSES = ["to_read", "reading", "read", "noted", "discarded"] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const READING_LABEL: Record<ReadingStatus, string> = {
  to_read: "A ler",
  reading: "Lendo",
  read: "Lido",
  noted: "Fichado",
  discarded: "Descartado",
};

export const RELEVANCES = ["central", "support", "peripheral"] as const;
export type Relevance = (typeof RELEVANCES)[number];

export const RELEVANCE_LABEL: Record<Relevance, string> = {
  central: "Central",
  support: "Apoio",
  peripheral: "Periférico",
};

export const isReadingStatus = (v: unknown): v is ReadingStatus =>
  typeof v === "string" && (READING_STATUSES as readonly string[]).includes(v);

export const isRelevance = (v: unknown): v is Relevance =>
  typeof v === "string" && (RELEVANCES as readonly string[]).includes(v);

export const readingLabel = (v: string | null | undefined) => (isReadingStatus(v) ? READING_LABEL[v] : "");
export const relevanceLabel = (v: string | null | undefined) => (isRelevance(v) ? RELEVANCE_LABEL[v] : "");

/** "Lidos": lido ou fichado. */
export const isRead = (v: string) => v === "read" || v === "noted";
