"use client";

import { useActionState } from "react";
import type { AuthState } from "../login/actions";
import { setNewPassword } from "./actions";

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fx-nova" className="label">
          Senha nova
        </label>
        <input id="fx-nova" name="password" className="field" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fx-confirma" className="label">
          Repita a senha nova
        </label>
        <input
          id="fx-confirma"
          name="confirm"
          className="field"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <p aria-live="polite" className="m-0 text-sm empty:hidden">
        {state.error && <span className="text-warn">{state.error}</span>}
      </p>
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar senha nova"}
      </button>
    </form>
  );
}
