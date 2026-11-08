"use client";

import { useActionState, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { createProject, type CreateProjectState } from "./actions";

/** "+" da barra lateral: abre um campo inline para nomear o projeto. */
export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Novo projeto"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <PlusIcon />
      </button>
      {open && (
        <form action={action} className="fixed inset-x-3 top-28 z-10 flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-lg min-[861px]:absolute min-[861px]:inset-x-auto min-[861px]:left-3 min-[861px]:w-[232px]">
          <label htmlFor="fx-novo-projeto" className="label">
            Nome do projeto
          </label>
          <input
            id="fx-novo-projeto"
            name="name"
            className="field"
            required
            autoFocus
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          />
          {state.error && <p className="m-0 text-sm text-warn">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              Criar
            </button>
          </div>
        </form>
      )}
    </>
  );
}
