"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect("/projects");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  const fullName = String(formData.get("name") ?? "").trim();
  if (password.length < 8) return { error: "A senha precisa ter ao menos 8 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: fullName ? { full_name: fullName } : {} },
  });
  // Mensagem genérica: não revela se o e-mail já tem conta.
  if (error) {
    return {
      error: /password/i.test(error.message)
        ? "Senha fraca ou já vazada em outro site. Escolha outra."
        : "Não foi possível criar a conta.",
    };
  }
  if (!data.session) {
    return { message: "Conta criada. Confirme pelo link enviado ao seu e-mail." };
  }
  redirect("/projects");
}

/** Origem pública do pedido (localhost, preview ou produção), para o link do e-mail. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * "Esqueci minha senha": envia o e-mail de recuperação. A resposta é sempre a
 * mesma, exista ou não a conta, para não revelar quais e-mails estão cadastrados.
 */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Informe um e-mail válido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/auth/confirm?next=/redefinir-senha`,
  });
  if (error && /rate limit/i.test(error.message)) {
    return { error: "Muitos pedidos seguidos. Espere alguns minutos e tente de novo." };
  }
  return { message: "Se houver uma conta com esse e-mail, enviamos um link para criar uma senha nova." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
