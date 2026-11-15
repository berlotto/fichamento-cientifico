"use server";

import { redirect } from "next/navigation";
import { isRecentRecovery } from "@/lib/recovery";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "../login/actions";

/** Define a senha nova depois do link de recuperação (sem pedir a senha atual). */
export async function setNewPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter ao menos 8 caracteres." };
  if (password !== confirm) return { error: "As duas senhas não são iguais." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!isRecentRecovery(data?.claims)) {
    return { error: "O link expirou. Volte ao login e peça outro em “Esqueci minha senha”." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: /pwned|leaked|weak/i.test(error.message)
        ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra."
        : /same/i.test(error.message)
          ? "A senha nova precisa ser diferente da anterior."
          : "Não foi possível salvar a senha nova.",
    };
  }
  redirect("/projects");
}
