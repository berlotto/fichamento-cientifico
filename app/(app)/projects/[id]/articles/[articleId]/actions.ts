"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_NOTES = 20_000;

/** Grava "Minhas notas". RLS garante que o artigo é do usuário. */
export async function saveNotes(articleId: string, notes: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("articles")
    .update({ notes: notes.slice(0, MAX_NOTES) || null })
    .eq("id", articleId);
  return { ok: !error };
}
