"use client";

import { useState, useTransition } from "react";
import { saveCritique, type CritiquePart } from "./actions";

const PARTS: { part: CritiquePart; label: string; placeholder: string }[] = [
  { part: "strengths", label: "Pontos fortes", placeholder: "O que o estudo faz bem: desenho, amostra, análise, argumento" },
  { part: "weaknesses", label: "Pontos fracos", placeholder: "Limitações que você vê, mesmo as que os autores não admitem" },
  {
    part: "relevance",
    label: "Relação com minha pesquisa",
    placeholder: "Como o artigo entra no seu trabalho: em que capítulo, para sustentar ou contrapor o quê",
  },
  { part: "notes", label: "Notas livres", placeholder: "Debates, conexões com outros artigos, ideias para a revisão" },
];

/** Uma parte da análise crítica, salva ao sair do campo. */
function CritiqueField({
  articleId,
  part,
  label,
  placeholder,
  initial,
}: {
  articleId: string;
  part: CritiquePart;
  label: string;
  placeholder: string;
  initial: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const id = `fx-crit-${part}`;

  function save() {
    if (value === saved) return;
    startTransition(async () => {
      const { ok } = await saveCritique(articleId, part, value);
      if (ok) setSaved(value);
      setMsg(ok ? "Salvo" : "Não foi possível salvar");
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </label>
        <span aria-live="polite" className="text-xs text-muted">
          {pending ? "Salvando…" : value !== saved ? "" : msg}
        </span>
      </div>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder={placeholder}
        className="field resize-y p-3 text-[15px] leading-normal"
      />
    </div>
  );
}

/**
 * Análise crítica do artigo (spec 001): a leitura do pesquisador, separada do
 * que foi extraído. "Notas livres" é o antigo "Minhas notas" (articles.notes).
 */
export function Critique({
  articleId,
  initial,
}: {
  articleId: string;
  initial: Record<CritiquePart, string>;
}) {
  return (
    <section className="flex flex-col gap-4 border-l-2 border-accent pl-5" aria-labelledby="fx-critica">
      <div className="flex flex-col gap-1">
        <h2 id="fx-critica" className="eyebrow">
          Minha análise crítica
        </h2>
        <p className="m-0 text-[13px] text-muted">Sua leitura do artigo. Fica separada do que foi extraído dele.</p>
      </div>
      {PARTS.map((p) => (
        <CritiqueField key={p.part} articleId={articleId} {...p} initial={initial[p.part]} />
      ))}
    </section>
  );
}
