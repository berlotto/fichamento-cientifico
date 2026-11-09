"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BUILTIN_FIELDS, fieldKey } from "@/lib/fields";
import { removeUnreferencedPdfs } from "@/lib/storage-cleanup";
import { createClient } from "@/lib/supabase/server";

export type CreateProjectState = { error?: string };

export async function createProject(
  _: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert({ name }).select("id").single();
  if (error?.code === "P0001") return { error: error.message };
  if (error || !data) return { error: "Não foi possível criar o projeto." };

  redirect(`/projects/${data.id}`);
}

export type ProjectActionState = { ok?: boolean; error?: string };

export async function renameProject(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const id = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  if (!name) return { error: "Informe um nome." };
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ name }).eq("id", id);
  if (error) return { error: "Não foi possível renomear." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Exclui o projeto, seus artigos e os PDFs que nenhum outro projeto usa (A11). */
export async function deleteProject(projectId: string): Promise<ProjectActionState> {
  await requireUser();
  const supabase = await createClient();
  const { data: articles } = await supabase.from("articles").select("storage_path").eq("project_id", projectId);
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: "Não foi possível excluir o projeto." };
  await removeUnreferencedPdfs(supabase, (articles ?? []).map((a) => a.storage_path));
  revalidatePath("/projects", "layout");
  redirect("/projects");
}

/** Novo campo personalizado. Vale para as próximas extrações (e para "Extrair de novo"). */
export async function addProjectField(_: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 80);
  const instructions = String(formData.get("instructions") ?? "").trim().slice(0, 1000) || null;
  if (!label) return { error: "Dê um nome ao campo." };
  const key = fieldKey(label);
  if (BUILTIN_FIELDS.some((f) => f.key === key)) return { error: "Esse campo já existe na ficha." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("project_fields")
    .select("key", { count: "exact", head: true })
    .eq("project_id", projectId);
  const { error } = await supabase
    .from("project_fields")
    .insert({ project_id: projectId, key, label, instructions, position: count ?? 0 });
  if (error?.code === "23505") return { error: "Já existe um campo com esse nome." };
  if (error?.code === "P0001") return { error: error.message };
  if (error) return { error: "Não foi possível criar o campo." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function removeProjectField(projectId: string, key: string): Promise<ProjectActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_fields").delete().eq("project_id", projectId).eq("key", key);
  if (error) return { error: "Não foi possível remover o campo." };
  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Pede a extração de todos os artigos do projeto (ex.: depois de criar campos). */
export async function reextractProject(projectId: string): Promise<ProjectActionState & { queued?: number }> {
  await requireUser();
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["extracted", "needs_review", "verified", "failed"]);
  let queued = 0;
  for (const a of articles ?? []) {
    const { error } = await supabase.rpc("request_extract", { article: a.id });
    if (error) {
      revalidatePath("/projects", "layout");
      return { queued, error: error.code === "P0001" ? error.message : "Não foi possível pedir a extração." };
    }
    queued++;
  }
  revalidatePath("/projects", "layout");
  return { ok: true, queued };
}
