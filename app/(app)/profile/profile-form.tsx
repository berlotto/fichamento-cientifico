"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ name, institution }: { name: string; institution: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 min-[861px]:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-pnome" className="label">
            Nome
          </label>
          <input id="fx-pnome" name="name" className="field" type="text" defaultValue={name} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-pinst" className="label">
            Instituição
          </label>
          <input
            id="fx-pinst"
            name="institution"
            className="field"
            type="text"
            defaultValue={institution}
            autoComplete="organization"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <span aria-live="polite" className="text-[13px] text-muted">
          {state.error ? <span className="text-warn">{state.error}</span> : state.message}
        </span>
        <button className="btn" type="submit" disabled={pending}>
          Salvar alterações
        </button>
      </div>
    </form>
  );
}
