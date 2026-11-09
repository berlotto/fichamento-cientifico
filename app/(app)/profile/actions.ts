"use server";

import { validFont } from "@/lib/fonts";
import { validLanguage } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

/** Guarda as fontes na conta (vale em outros aparelhos). */
export async function saveFonts(ui: string, article: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { font_ui: validFont(ui, "ui"), font_article: validFont(article, "article") },
  });
  return { ok: !error };
}

/** Idioma padrão das fichas nos projetos novos. */
export async function saveDefaultLanguage(code: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { default_output_language: validLanguage(code) } });
  return { ok: !error };
}

export type PasswordState = { ok?: boolean; error?: string };

/**
 * Troca de senha. Confere a senha atual antes (entrando de novo com ela), para
 * que uma sessão esquecida aberta não baste para trocar a senha.
 */
export async function changePassword(current: string, next: string, confirm: string): Promise<PasswordState> {
  if (next.length < 8) return { error: "A nova senha precisa ter ao menos 8 caracteres." };
  if (next.length > 72) return { error: "A nova senha pode ter no máximo 72 caracteres." };
  if (next !== confirm) return { error: "A confirmação não confere com a nova senha." };
  if (next === current) return { error: "A nova senha precisa ser diferente da atual." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: "Sessão expirada. Entre de novo." };

  const { error: wrong } = await supabase.auth.signInWithPassword({ email, password: current });
  if (wrong) return { error: "Senha atual incorreta." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return {
      error: /pwned|leaked|weak/i.test(error.message)
        ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra."
        : "Não foi possível trocar a senha.",
    };
  }
  return { ok: true };
}

/** Nome e instituição (versão para a modal de configurações). */
export async function saveAccount(fullName: string, institution: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName.trim().slice(0, 200) || null,
      institution: institution.trim().slice(0, 200) || null,
    },
  });
  return { ok: !error };
}
