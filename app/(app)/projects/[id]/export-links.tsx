"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/icons";

/**
 * Botões de exportação do projeto. "Incluir minha análise crítica" acrescenta,
 * no Excel e no CSV, os comentários por campo e a análise crítica (spec 001).
 * Fica desligado por padrão: a planilha costuma ser compartilhada. Artigos
 * descartados (spec 004) ficam de fora, a menos que se peça.
 */
export function ExportLinks({
  projectId,
  refStyle,
  refLabel,
}: {
  projectId: string;
  refStyle: string;
  refLabel: string;
}) {
  const [critique, setCritique] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const link = (format: string, label: string, withCritique = false) => (
    <a
      href={`/api/export/${projectId}?format=${format}${withCritique && critique ? "&comentarios=1" : ""}${discarded ? "&descartados=1" : ""}`}
      className="btn min-h-9 px-3 text-[13px]"
      download
    >
      <DownloadIcon size={16} />
      {label}
    </a>
  );
  return (
    <>
      {link("xlsx", "Excel", true)}
      {link("csv", "CSV", true)}
      {link("bib", "BibTeX")}
      {link(refStyle, `Referências ${refLabel}`)}
      <label className="flex min-h-9 basis-full items-center gap-2 text-[13px] text-muted">
        <input type="checkbox" checked={critique} onChange={(e) => setCritique(e.target.checked)} />
        Incluir minha análise crítica no Excel e no CSV
      </label>
      <label className="-mt-2 flex min-h-9 basis-full items-center gap-2 text-[13px] text-muted">
        <input type="checkbox" checked={discarded} onChange={(e) => setDiscarded(e.target.checked)} />
        Incluir os artigos descartados
      </label>
    </>
  );
}
