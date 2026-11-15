"use client";

import { useState, useTransition } from "react";
import { saveReading, type ReadingPatch } from "@/app/(app)/projects/[id]/articles/[articleId]/actions";
import { StarIcon } from "@/components/icons";
import {
  READING_LABEL,
  READING_STATUSES,
  RELEVANCE_LABEL,
  RELEVANCES,
  type ReadingStatus,
  type Relevance,
} from "@/lib/reading";

export type ReadingState = { reading_status: ReadingStatus; relevance: Relevance | null; starred: boolean };

/** Estado otimista: muda na hora e volta se o servidor recusar. */
function useReading(articleId: string, initial: ReadingState) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function update(patch: Partial<ReadingState>) {
    const before = state;
    setState({ ...state, ...patch });
    setError("");
    startTransition(async () => {
      const r = await saveReading(articleId, patch as ReadingPatch);
      if (!r.ok) {
        setState(before);
        setError(r.error ?? "Não foi possível salvar.");
      }
    });
  }
  return { state, update, error, pending };
}

export function StarButton({
  starred,
  onToggle,
  size = 18,
}: {
  starred: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      className={`icon-btn ${starred ? "text-warn" : "text-muted"}`}
      aria-pressed={starred}
      aria-label={starred ? "Tirar prioridade" : "Marcar como prioridade"}
      title={starred ? "Prioridade (clique para tirar)" : "Marcar como prioridade"}
      onClick={onToggle}
    >
      <StarIcon size={size} filled={starred} />
    </button>
  );
}

/** Situação, relevância e estrela na ficha. */
export function ReadingControls({ articleId, initial }: { articleId: string; initial: ReadingState }) {
  const { state, update, error } = useReading(articleId, initial);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <StarButton starred={state.starred} onToggle={() => update({ starred: !state.starred })} />
      <label className="flex items-center gap-2 text-[13px] text-muted">
        Leitura
        <select
          className="field min-h-9 w-auto py-1 pr-8 pl-2.5 text-[13px] text-ink"
          value={state.reading_status}
          onChange={(e) => update({ reading_status: e.target.value as ReadingStatus })}
        >
          {READING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {READING_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="segmented [&>button]:min-h-8 [&>button]:px-3 [&>button]:text-[13px]" role="group" aria-label="Relevância">
        {RELEVANCES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={state.relevance === r}
            // Clicar de novo na relevância marcada tira a marcação.
            onClick={() => update({ relevance: state.relevance === r ? null : r })}
          >
            {RELEVANCE_LABEL[r]}
          </button>
        ))}
      </div>
      {error && <span className="text-xs text-warn">{error}</span>}
    </div>
  );
}

/** Versão compacta para a lista de artigos: estrela e situação. */
export function ReadingQuick({ articleId, initial }: { articleId: string; initial: ReadingState }) {
  const { state, update } = useReading(articleId, initial);
  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="Situação de leitura"
        className="max-w-[7.5rem] cursor-pointer rounded-md border-0 bg-transparent py-0.5 text-xs text-muted hover:bg-page"
        value={state.reading_status}
        onChange={(e) => update({ reading_status: e.target.value as ReadingStatus })}
      >
        {READING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {READING_LABEL[s]}
          </option>
        ))}
      </select>
      <StarButton size={16} starred={state.starred} onToggle={() => update({ starred: !state.starred })} />
    </div>
  );
}
