"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, signIn, signUp, type AuthState } from "./actions";

type Mode = "signin" | "signup" | "reset";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const [resetState, resetAction, resetting] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  const isSignup = mode === "signup";
  const isReset = mode === "reset";
  const state = isReset ? resetState : isSignup ? signUpState : signInState;
  const pending = signingIn || signingUp || resetting;

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-6">
      <div className="font-serif text-[28px] tracking-[-0.01em]">Fichamento</div>

      {isReset ? (
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-lg font-medium">Esqueci minha senha</h1>
          <p className="m-0 text-sm text-muted">
            Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.
          </p>
        </div>
      ) : (
        <div className="segmented">
          <button type="button" aria-pressed={!isSignup} onClick={() => setMode("signin")}>
            Entrar
          </button>
          <button type="button" aria-pressed={isSignup} onClick={() => setMode("signup")}>
            Criar conta
          </button>
        </div>
      )}

      <form action={isReset ? resetAction : isSignup ? signUpAction : signInAction} className="flex flex-col gap-4">
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
        {!isReset && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="fx-senha" className="label">
                Senha
              </label>
              {!isSignup && (
                <button
                  type="button"
                  className="text-xs text-muted underline underline-offset-2 hover:text-ink"
                  onClick={() => setMode("reset")}
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
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
        )}

        <p aria-live="polite" className="m-0 text-sm empty:hidden">
          {state.error && <span className="text-warn">{state.error}</span>}
          {state.message && <span className="text-accent">{state.message}</span>}
        </p>

        <button className="btn btn-primary w-full" type="submit" disabled={pending}>
          {pending ? "Aguarde…" : isReset ? "Enviar link" : isSignup ? "Criar conta" : "Entrar"}
        </button>
        {isReset && (
          <button type="button" className="text-sm text-muted underline underline-offset-2" onClick={() => setMode("signin")}>
            Voltar para o login
          </button>
        )}
      </form>
    </div>
  );
}
