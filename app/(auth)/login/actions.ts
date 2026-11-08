"use server";

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
