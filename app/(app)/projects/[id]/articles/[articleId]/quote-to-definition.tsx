"use client";

import { useState, useTransition } from "react";
import { definitionFromQuote } from "../../glossary-actions";

export type ConceptOption = { id: string; name: string };

/** "Usar como definição": a citação vira definição de um conceito do glossário (spec 006, R6). */
export function QuoteToDefinition({ quoteId, concepts }: { quoteId: string; concepts: ConceptOption[] }) {
  const [open, setOpen] = useState(false);
  const [concept, setConcept] = useState(concepts[0]?.id ?? "");
  const [origin, setOrigin] = useState<"own" | "cited">("own");
  const [kind, setKind] = useState<"definition" | "operationalization">("definition");
  const [ref, setRef] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (concepts.length === 0) return null;

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button type="button" className="text-xs text-muted underline underline-offset-2" onClick={() => setOpen(true)}>
          Usar como definição no glossário
        </button>
        {msg?.ok && <span className="text-xs text-accent">{msg.text}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-page p-3 text-[13px]">
      <div className="flex flex-wrap gap-2">
        <select className="field min-h-9 w-auto py-1 text-[13px]" value={concept} onChange={(e) => setConcept(e.target.value)} aria-label="Conceito">
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="field min-h-9 w-auto py-1 text-[13px]"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          aria-label="Tipo"
        >
          <option value="definition">Definição</option>
          <option value="operationalization">Operacionalização (como foi medido)</option>
        </select>
        <select
          className="field min-h-9 w-auto py-1 text-[13px]"
          value={origin}
          onChange={(e) => setOrigin(e.target.value as typeof origin)}
          aria-label="Origem"
        >
          <option value="own">Dos autores</option>
          <option value="cited">Citada de outro trabalho</option>
        </select>
        {origin === "cited" && (
          <input
            className="field min-h-9 w-48 py-1 text-[13px]"
            value={ref}
            maxLength={500}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Referência (ex.: Masten, 2001)"
            aria-label="Referência citada"
          />
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary min-h-8 px-3 text-xs"
          disabled={pending || !concept}
          onClick={() =>
            start(async () => {
              const r = await definitionFromQuote(quoteId, concept, origin, kind, ref);
              if (r.ok) {
                setOpen(false);
                setMsg({ ok: true, text: "Adicionada ao glossário." });
              } else setMsg({ ok: false, text: r.error });
            })
          }
        >
          Adicionar
        </button>
        <button type="button" className="btn min-h-8 px-3 text-xs" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
      {msg && !msg.ok && <p className="m-0 text-xs text-warn">{msg.text}</p>}
    </div>
  );
}
