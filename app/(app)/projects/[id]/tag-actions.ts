"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cleanTagName, MAX_TAGS_PER_PROJECT, sameTagName, TAG_COLORS, type Tag } from "@/lib/tags";

export type TagResult = { ok: true } | { ok: false; error: string };
export type Tagging = { id: string; tag_id: string; field_key: string | null; quote_id: string | null };

const FIELD_KEY = /^[a-z][a-z0-9_]{1,39}$/;

function tagError(code: string | undefined, message: string | undefined): string {
  if (code === "23505") return "Já existe uma tag com esse nome neste projeto.";
  if (code === "23514" && /limite/.test(message ?? "")) return `O projeto já tem ${MAX_TAGS_PER_PROJECT} tags, o máximo.`;
  if (code === "23514" && /nível|subtema/.test(message ?? "")) return "Só um nível de subtema: tema › subtema.";
  return "Não foi possível salvar a tag.";
}

/**
 * Marca o artigo, um campo da ficha ou uma citação com a tag de nome `name`,
 * criando a tag no projeto do artigo se ela ainda não existe.
 */
export async function addTagging(
  articleId: string,
  target: { fieldKey?: string; quoteId?: string },
  name: string,
): Promise<({ ok: true; tagging: Tagging; tag: Tag; created: boolean }) | { ok: false; error: string }> {
  await requireUser();
  const clean = cleanTagName(name);
  if (!clean) return { ok: false, error: "Digite o nome da tag." };
  if (target.fieldKey && !FIELD_KEY.test(target.fieldKey)) return { ok: false, error: "Campo inválido." };
  if (target.fieldKey && target.quoteId) return { ok: false, error: "Escolha um alvo só." };

  const supabase = await createClient();
  const { data: article } = await supabase.from("articles").select("project_id").eq("id", articleId).maybeSingle();
  if (!article) return { ok: false, error: "Artigo não encontrado." };

  const { data: existing } = await supabase
    .from("tags")
    .select("id, name, parent_id, color")
    .eq("project_id", article.project_id)
    .ilike("name", clean.replace(/[\\%_]/g, "\\$&"));
  let tag = existing?.find((t) => sameTagName(t.name, clean));
  let created = false;
  if (!tag) {
    const ins = await supabase
      .from("tags")
      .insert({ project_id: article.project_id, name: clean })
      .select("id, name, parent_id, color")
      .single();
    if (ins.error) return { ok: false, error: tagError(ins.error.code, ins.error.message) };
    tag = ins.data;
    created = true;
  }

  const row = {
    tag_id: tag.id,
    article_id: articleId,
    field_key: target.fieldKey ?? null,
    quote_id: target.quoteId ?? null,
  };
  const ins = await supabase.from("taggings").insert(row).select("id, tag_id, field_key, quote_id").single();
  if (ins.error) {
    if (ins.error.code !== "23505") return { ok: false, error: "Não foi possível aplicar a tag." };
    // Já marcado: devolve a marcação que existe.
    let q = supabase.from("taggings").select("id, tag_id, field_key, quote_id").eq("tag_id", tag.id).eq("article_id", articleId);
    q = target.fieldKey ? q.eq("field_key", target.fieldKey) : q.is("field_key", null);
    q = target.quoteId ? q.eq("quote_id", target.quoteId) : q.is("quote_id", null);
    const { data } = await q.maybeSingle();
    if (!data) return { ok: false, error: "Não foi possível aplicar a tag." };
    return { ok: true, tagging: data, tag, created };
  }
  revalidatePath("/projects", "layout");
  return { ok: true, tagging: ins.data, tag, created };
}

export async function removeTagging(taggingId: string): Promise<TagResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("taggings").delete().eq("id", taggingId);
  if (error) return { ok: false, error: "Não foi possível remover a tag." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function createTag(projectId: string, name: string, parentId: string | null): Promise<TagResult> {
  await requireUser();
  const clean = cleanTagName(name);
  if (!clean) return { ok: false, error: "Digite o nome da tag." };
  const supabase = await createClient();
  const { error } = await supabase.from("tags").insert({ project_id: projectId, name: clean, parent_id: parentId || null });
  if (error) return { ok: false, error: tagError(error.code, error.message) };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function updateTag(
  tagId: string,
  patch: { name?: string; color?: string; description?: string; parent_id?: string | null },
): Promise<TagResult> {
  await requireUser();
  const update: { name?: string; color?: string; description?: string | null; parent_id?: string | null } = {};
  if (patch.name !== undefined) {
    const clean = cleanTagName(patch.name);
    if (!clean) return { ok: false, error: "O nome não pode ficar vazio." };
    update.name = clean;
  }
  if (patch.color !== undefined) {
    if (!(TAG_COLORS as readonly string[]).includes(patch.color)) return { ok: false, error: "Cor inválida." };
    update.color = patch.color;
  }
  if (patch.description !== undefined) update.description = patch.description.trim().slice(0, 500) || null;
  if (patch.parent_id !== undefined) update.parent_id = patch.parent_id || null;

  const supabase = await createClient();
  const { error } = await supabase.from("tags").update(update).eq("id", tagId);
  if (error) return { ok: false, error: tagError(error.code, error.message) };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Junta `src` em `dst`: as marcações de `src` passam para `dst` e `src` é apagada. */
export async function mergeTags(src: string, dst: string): Promise<TagResult> {
  await requireUser();
  if (src === dst) return { ok: false, error: "Escolha outra tag." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_tags", { src, dst });
  if (error) return { ok: false, error: "Não foi possível juntar as tags." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function deleteTag(tagId: string): Promise<TagResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) return { ok: false, error: "Não foi possível excluir a tag." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}
