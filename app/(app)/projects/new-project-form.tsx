"use client";

import { useActionState } from "react";
import { createProject, type CreateProjectState } from "./actions";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input
        name="name"
        required
        placeholder="Nome do projeto (ex.: Revisão glaucoma e UV)"
        className="min-w-72 flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Criar projeto
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
