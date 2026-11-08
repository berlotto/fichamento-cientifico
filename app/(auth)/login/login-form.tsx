"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const isSignup = mode === "signup";
  const state = isSignup ? signUpState : signInState;
  const pending = signingIn || signingUp;

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-6">
      <div className="font-serif text-[28px] tracking-[-0.01em]">Fichamento</div>

      <div className="segmented">
        <button type="button" aria-pressed={!isSignup} onClick={() => setMode("signin")}>
          Entrar
        </button>
        <button type="button" aria-pressed={isSignup} onClick={() => setMode("signup")}>
          Criar conta
        </button>
      </div>

      <form action={isSignup ? signUpAction : signInAction} className="flex flex-col gap-4">
        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fx-nome" className="label">
              Nome
            </label>
            <input id="fx-nome" name="name" className="field" type="text" autoComplete="name" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-email" className="label">
            E-mail
          </label>
          <input id="fx-email" name="email" className="field" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fx-senha" className="label">
            Senha
          </label>
          <input
            id="fx-senha"
            name="password"
            className="field"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        <p aria-live="polite" className="m-0 text-sm empty:hidden">
          {state.error && <span className="text-warn">{state.error}</span>}
          {state.message && <span className="text-accent">{state.message}</span>}
        </p>

        <button className="btn btn-primary w-full" type="submit" disabled={pending}>
          {pending ? "Aguarde…" : isSignup ? "Criar conta" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
