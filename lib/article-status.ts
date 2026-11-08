/**
 * Status do artigo no vocabulário do design: "ok" (accent), "rev" (atenção),
 * "wait" (neutro, o pipeline ainda vai mexer).
 */
export type StatusTone = "ok" | "rev" | "wait";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  uploaded: { label: "Na fila", tone: "wait" },
  parsed: { label: "Texto extraído", tone: "wait" },
  extracted: { label: "Extraído", tone: "wait" },
  verified: { label: "Validado", tone: "ok" },
  needs_review: { label: "Em revisão", tone: "rev" },
  needs_ocr: { label: "Precisa de OCR", tone: "rev" },
  failed: { label: "Falhou", tone: "rev" },
};

export function articleStatus(status: string) {
  return STATUS[status] ?? { label: status, tone: "wait" as const };
}

export const TONE_CLASS: Record<StatusTone, string> = {
  ok: "text-accent",
  rev: "text-warn",
  wait: "text-muted",
};

/** Status em que o pipeline ainda vai mexer sozinho. */
export const IN_PROGRESS = new Set(["uploaded"]);
