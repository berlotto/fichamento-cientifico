"use server";

import { revalidatePath } from "next/cache";
import { validFont } from "@/lib/fonts";
import { validLanguage } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; message?: string };

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const fullName = String(formData.get("name") ?? "").trim().slice(0, 200);
  const institution = String(formData.get("institution") ?? "").trim().slice(0, 200);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName || null, institution: institution || null },
  });
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/", "layout");
  return { message: "Alterações salvas." };
}

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
