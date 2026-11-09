"use client";

import { useState } from "react";
import { refText, type CitationStyle, type RefPart } from "@/lib/citation";
import { CopyButton } from "./copy-button";

const LABELS: Record<CitationStyle, string> = {
  abnt: "ABNT",
  apa: "APA",
  vancouver: "Vancouver",
  bibtex: "BibTeX",
};

function Rendered({ parts }: { parts: RefPart[] }) {
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : "b" in p ? (
      <strong key={i} className="font-semibold">
        {p.b}
      </strong>
    ) : (
      <em key={i}>{p.i}</em>
    ),
  );
}

/** Referência do artigo em cada norma, com copiar. Copia texto simples (sem negrito/itálico). */
export function CitationTabs({ refs }: { refs: Record<CitationStyle, RefPart[]> }) {
  const [style, setStyle] = useState<CitationStyle>("abnt");
  const text = refText(refs[style]);

  return (
    <div className="flex flex-col gap-3">
      <div className="segmented" role="group" aria-label="Norma da referência">
        {(Object.keys(LABELS) as CitationStyle[]).map((s) => (
          <button key={s} type="button" aria-pressed={s === style} onClick={() => setStyle(s)}>
            {LABELS[s]}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-3">
        {style === "bibtex" ? (
          <pre className="m-0 min-w-0 flex-1 overflow-x-auto font-mono text-[12.5px] leading-[1.6] whitespace-pre">{text}</pre>
        ) : (
          <p className="font-article m-0 min-w-0 flex-1 text-[15px] leading-[1.6] break-words">
            <Rendered parts={refs[style]} />
          </p>
        )}
        <CopyButton text={text} />
      </div>
    </div>
  );
}
