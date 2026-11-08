export const STATUS_LABEL: Record<string, string> = {
  uploaded: "na fila",
  parsed: "texto extraído",
  needs_ocr: "precisa de OCR",
  extracted: "extraído",
  verified: "verificado",
  needs_review: "revisar",
  failed: "falhou",
};

export const STATUS_CLASS: Record<string, string> = {
  uploaded: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  parsed: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  needs_ocr: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

/** Status em que o pipeline ainda vai mexer sozinho. */
export const IN_PROGRESS = new Set(["uploaded"]);
