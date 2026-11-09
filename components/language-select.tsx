"use client";

import { useState, useTransition } from "react";
import { saveDefaultLanguage } from "@/app/(app)/profile/actions";
import { setProjectLanguage } from "@/app/(app)/projects/actions";
import { OUTPUT_LANGUAGES } from "@/lib/languages";

function LanguageSelect({
  id,
  initial,
  save,
  savedText,
}: {
  id: string;
  initial: string;
  save: (code: string) => Promise<{ ok?: boolean; error?: string }>;
  savedText: string;
}) {
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        id={id}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const code = e.target.value;
          setValue(code);
          start(async () => {
            const r = await save(code);
            setMsg(r.ok ? savedText : (r.error ?? "Não foi possível salvar."));
          });
        }}
        className="field min-w-[220px] cursor-pointer"
      >
        {OUTPUT_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="text-xs text-muted">
        {pending ? "Salvando…" : msg}
      </span>
    </div>
  );
}

/** Idioma das fichas deste projeto. */
export function ProjectLanguage({ projectId, initial }: { projectId: string; initial: string }) {
  return (
    <LanguageSelect
      id="fx-idioma-projeto"
      initial={initial}
      save={(code) => setProjectLanguage(projectId, code)}
      savedText="Salvo. Vale para as próximas extrações."
    />
  );
}

/** Idioma padrão das fichas nos projetos novos (perfil). */
export function DefaultLanguage({ initial }: { initial: string }) {
  return (
    <LanguageSelect
      id="fx-idioma-padrao"
      initial={initial}
      save={saveDefaultLanguage}
      savedText="Salvo. Vale para os projetos que você criar."
    />
  );
}
