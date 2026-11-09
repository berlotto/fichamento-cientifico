"use client";

import { useState, useTransition } from "react";
import { saveNotes } from "./actions";

export function NotesField({ articleId, initial }: { articleId: string; initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    if (value === saved) return;
    startTransition(async () => {
      const { ok } = await saveNotes(articleId, value);
      if (ok) setSaved(value);
      setMsg(ok ? "Salvo" : "Não foi possível salvar");
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="fx-notas" className="eyebrow">
          Minhas notas
        </label>
        <span aria-live="polite" className="text-xs text-muted">
          {pending ? "Salvando…" : value !== saved ? "" : msg}
        </span>
      </div>
      <textarea
        id="fx-notas"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Debates, conexões com outros artigos, ideias para a revisão"
        className="field font-article resize-y p-3 text-[15px] leading-normal"
      />
    </section>
  );
}
